"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import aj from "@/lib/arcjet";
import { request } from "@arcjet/next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { parse } from "date-fns";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const serializeAmount = (obj) => ({
    ...obj,
    amount: obj.amount.toNumber()
})

export async function createTransaction(data) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const req = await request()
    //check rate limit
    const decision = await aj.protect(req, {
        userId,
        requested: 1 // specify # of tokens are consumed
    })

    if(decision.isDenied()){
        if(decision.reason.isRateLimit()){
            const {remaining, reset} = decision.reason;
            console.error({
                code: "RATE_LIMIT_EXCEEDED",
                details: {
                    remaining,
                    resetInSeconds: reset
                }
            })
            throw new Error("Too many requests. Please try again later.");
        }
        throw new Error("Request blocked");
    }




    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const account = await db.account.findUnique({
      where: { id: data.accountId, userId: user.id },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    //calculate balance change after adding new transaction
    const balanceChange = data.type === "EXPENXSE" ? -data.amount : data.amount;
    const newBalance = account.balance + balanceChange;

    const transaction = await db.$transaction(async (tx) => {
        const newTransaction = await tx.transaction.create({
            data: {
                ...data,
                userId: user.id,
                nextRecurringDate: 
                    data.isRecurring && data.recurringInterval
                    ? calculateNextRecurringDate(data.date, data.recurringInterval)
                    : null
            }
        })

        await tx.account.update({
            where: {id: data.accountId},
            data:{
                balance: newBalance
            }
        })
    
        return newTransaction
    })

    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`)
    return {success: true, data: serializeAmount(transaction)}
  } catch (error) {
    throw new Error(error.message)
  }

}

// Helper function to calculate next recurring date
function calculateNextRecurringDate(startDate, interval) {
    const date = new Date(startDate);
  
    switch (interval) {
      case "DAILY":
        date.setDate(date.getDate() + 1);
        break;
      case "WEEKLY":
        date.setDate(date.getDate() + 7);
        break;
      case "MONTHLY":
        date.setMonth(date.getMonth() + 1);
        break;
      case "YEARLY":
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
  
    return date;
  }

  export async function scanReceipt(file){
    try {
        const model = genAI.getGenerativeModel({model: "gemini-1.5-flash"});

    //convert input file to array buffer
    const arrayBuffer = await file.arrayBuffer();
    //convert array buffer to base64
    const base64String = Buffer.from(arrayBuffer).toString("base64");

    const prompt = `Analyze this receipt image and extract the following information in JSON format:
      - Total amount (just the number)
      - Date (in ISO format)
      - Description or items purchased (brief summary)
      - Merchant/store name
      - Suggested category (one of: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense )
      
      Only respond with valid JSON in this exact format:
      {
        "amount": number,
        "date": "ISO date string",
        "description": "string",
        "merchantName": "string",
        "category": "string"
      }

      If its not a recipt, return an empty object`

    //Pass the file data to model
    const result = await model.generateContent([
        {
            inlineData: {
                data: base64String,
                mimeType: file.type
            }
        },
        prompt,
    ])

    //Get response and extranct useful part
    const response = await result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    //put the response in the server return response
    try {
        const data = JSON.parse(cleanedText);
        return {
            amount: parseFloat(data.amount),
            date: new Date(data.date),
            description: data.description,
            merchantName: data.merchantName,
            category: data.category
        }
    } catch (error) {
        console.error("Error parsing JSON response:", parseError);
      throw new Error("Invalid response format from Gemini");
    }



    } catch (error) {
        console.error("Error scanning receipt:", error);
        throw new Error("Failed to scan receipt");
    }
    

  }

  export async function getTransaction(id){
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const transaction = await db.transaction.findUnique({
      where: { id, userId: user.id },
    });

    if(!transaction){
      throw new Error("Transaction not found");
    }

    return serializeAmount(transaction)
  }

  export async function updateTransaction(id, data){
    try {
      const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    //get original transaction
    const originalTransaction = await db.transaction.findUnique({
      where: { id, userId: user.id },
      include: {account: true}
    });

    if (!originalTransaction) {
      throw new Error("Transaction not found");
    }

    const oldBalanceChange  = 
      originalTransaction.type === "EXPENSE" ? 
      -originalTransaction.amount.toNumber() : originalTransaction.amount.toNumber();

    const newBalanceChange = 
        data.type === "EXPENSE" ? 
        -data.amount : data.amount;

    const netChange = newBalanceChange - oldBalanceChange;
    // Update transaction and account balance in a transaction
    const transaction = await db.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: {
          id,
          userId: user.id,
        },
        data: {
          ...data,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      // Update account balance
      await tx.account.update({
        where: { id: data.accountId },
        data: {
          balance: {
            increment: netChange,
          },
        },
      });

      return updated;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);

    return { success: true, data: serializeAmount(transaction) };

    } catch (error) {
      throw new Error(error.message);
    }
  }
