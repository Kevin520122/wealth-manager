"use client";
import { transactionSchema } from "@/app/lib/schema";
import { CalendarIcon, Loader2 } from "lucide-react";
import useFetch from "@/hooks/use-fetch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createTransaction, updateTransaction } from "@/actions/transaction";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "@/components/ui/popover";
  import { Calendar } from "@/components/ui/calendar";
import { CreateAccountDrawer } from "@/components/create-account-drawer";
import { cn } from "@/lib/utils";
import { format, set } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { ReceiptScanner } from "./recipt-scanner";

export function AddTransactionForm({ 
  accounts, categories,
  editMode = false,
  initData = null
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get("edit");
  

    const {
    register,
    setValue,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    getValues,
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: 
    editMode && initData ? 
    {
      type: initData.type,
            amount: initData.amount.toString(),
            description: initData.description,
            accountId: initData.accountId,
            category: initData.category,
            date: new Date(initData.date),
            isRecurring: initData.isRecurring,
            ...(initData.recurringInterval && {
              recurringInterval: initData.recurringInterval,
            }),
    }
    :
    {
      type: "EXPENSE",
      amount: "",
      description: "",
      accountId: accounts.find((ac) => ac.isDefault)?.id,
      date: new Date(),
      isRecurring: false,
    },
  });

  const {
    loading: transactionLoading,
    fn: transactionFn,
    data: transactionData,
  } = useFetch(editMode ?  updateTransaction : createTransaction);

  // Real-time monitoring value change
  const type = watch("type");
  const isRecurring = watch("isRecurring");
  const date = watch("date");

  //Filter categories
  const filteredCategories = categories.filter(
    (category) => category.type === type
  );

  const onSubmit = async (data) => {
    const formData = {
        ...data,
        amount: parseFloat(data.amount)
    }

    //Deliever and process form data to back-end
    if(editMode){
      transactionFn(editId,formData)
    }else{
      transactionFn(formData)
    }
  }

  useEffect(() => {
    if(transactionData?.success && !transactionLoading){
        toast.success(
          editMode 
          ? "Transaction updated successfully" 
          :"Transaction created successfully"
        );
        reset();
        router.push(`/account/${transactionData.data.accountId}`);
    }
  }, [transactionData, transactionLoading, editMode])

  const handleScanComplete = (scannedData) => {
    if(scannedData){
    setValue("amount", scannedData.amount.toString());
    if(scannedData.description){
      setValue("description", scannedData.description);
    }
    if(scannedData.category){
      setValue("category", scannedData.category);
    }
    setValue("date", new Date(scannedData.date));
    toast.success("Receipt scanned successfully");
  }
  }


  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      {/*AI Recipt Scanner - only show when editMode is false*/}
      
        {!editMode &&<ReceiptScanner onScanComplete={handleScanComplete}/>}
      {/*Type*/}
      <div className="space-y-2">
        <label className="w-full text-sm font-medium">Type</label>
        <Select
          onValueChange={(value) => setValue("type", value)}
          defaultValue={type}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EXPENSE">Expense</SelectItem>
            <SelectItem value="INCOME">Income</SelectItem>
          </SelectContent>
        </Select>

        {/*if there is an error, render error message. Else, render nothing*/}
        {errors.type && (
          <p className="text-red-500 text-sm">{errors.type.message}</p>
        )}
      </div>

      {/*Amount & Account*/}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Amount</label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("amount")}
          />
          {/*if there is an error, render error message. Else, render nothing*/}
          {errors.amount && (
            <p className="text-red-500 text-sm">{errors.amount.message}</p>
          )}
        </div>

        {/*Select Account*/}
        <div className="space-y-2">
          <label className="text-sm font-medium">Account</label>
          <Select
            onValueChange={(value) => setValue("accountId", value)}
            defaultValue={getValues("accountId")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((ac) => (
                <SelectItem key={ac.id} value={ac.id}>
                  {ac.name} - ${parseFloat(ac.balance).toFixed(2)}
                </SelectItem>
              ))}

              <CreateAccountDrawer>
                <Button
                  variant="ghost"
                  className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                >
                  Create Account
                </Button>
              </CreateAccountDrawer>
            </SelectContent>
          </Select>

          {/*if there is an error, render error message. Else, render nothing*/}
          {errors.accountId && (
            <p className="text-red-500 text-sm">{errors.accountId.message}</p>
          )}
        </div>
      </div>

      {/*Categories*/}
      <div className="space-y-2">
        <label className="text-sm font-medium">Category</label>
        <Select
          onValueChange={(value) => setValue("category", value)}
          defaultValue={getValues("category")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            {filteredCategories.map((category) => (
              <SelectItem key={category.id} value={category.name}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/*if there is an error, render error message. Else, render nothing*/}
        {errors.category && (
          <p className="text-red-500 text-sm">{errors.category.message}</p>
        )}
      </div>
        {/*Date*/}
        <div className="space-y-2">
          <label className="text-sm font-medium">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full pl-3 text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                {date ? format(date, "PPP") : <span>Pick a date</span>}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(date) => setValue("date", date)}
                disabled={(date) =>
                  date > new Date() || date < new Date("1900-01-01")
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {/*if there is an error, render error message. Else, render nothing*/}
          {errors.date && (
            <p className="text-red-500 text-sm">{errors.date.message}</p>
          )}
        </div>

        {/*Description*/}
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Input
            placeholder="Enter Description"
            {...register("description")}
          />
          {/*if there is an error, render error message. Else, render nothing*/}
          {errors.description && (
            <p className="text-red-500 text-sm">{errors.description.message}</p>
          )}
        </div>

        {/* Recurring Toggle */}
      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <label className="text-base font-medium">Recurring Transaction</label>
          <div className="text-sm text-muted-foreground">
            Set up a recurring schedule for this transaction
          </div>
        </div>
        <Switch
          checked={isRecurring}
          onCheckedChange={(checked) => setValue("isRecurring", checked)}
        />
      </div>

      {/* Recurring Interval */}
      {isRecurring && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Recurring Interval</label>
          <Select
            onValueChange={(value) => setValue("recurringInterval", value)}
            defaultValue={getValues("recurringInterval")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="YEARLY">Yearly</SelectItem>
            </SelectContent>
          </Select>
          {errors.recurringInterval && (
            <p className="text-sm text-red-500">
              {errors.recurringInterval.message}
            </p>
          )}
        </div>
      )}
     
     {/*Actions Buttons*/}
     <div className="flex flex-col sm:flex-row gap-4">
        <Button
            type="button"
            variant="outline"
            className="w-1/2"
            onClick={()=>Router.back()}
        >Cancel</Button>
        <Button type="submit" className="w-1/2" disabled={transactionLoading}>
          {transactionLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {editMode ? "Updating..." : "Creating..."}
            </>
          ) : editMode ? (
            "Update Transaction"
          ) : (
            "Create Transaction"
          )}
        </Button>
     </div>
    </form>
  );
}
