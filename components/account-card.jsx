"use client";
import { ArrowUpRight, ArrowDownRight, CreditCard } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { updateDefaultAccount } from "@/actions/accounts";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { useEffect } from "react";

const AccountCard = ({ account }) => {
  const { name, type, balance, id, isDefault } = account;
  const {
    data: updatedDefaultAccount, 
    error, 
    fn: updatedDefaultFn, 
    loading: updatedDefaultLoading
  } = useFetch(updateDefaultAccount);

 const handleDefaultChange = async (event) => {
    event.preventDefault(); // Prevent pagenation
    if(isDefault){
        toast.warning("At least one account should be default")
        return; // Don't allow user to toggle off the only one default account
    }
    await updatedDefaultFn(id);
 }

 useEffect(() => {
    if(updatedDefaultAccount?.success){
        toast.success("Default account updated successfully!");
    }
 }, [updatedDefaultAccount, updatedDefaultLoading])

 useEffect(() => {
    if(error){
        toast.error(error.message || "Failed to update default account.");
    }
 }, [error])
 
  return (
    <Card className="hover:shadow-md transition-shadow group relative">
        <Link href={`/account/${id}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium capitalize">{name}</CardTitle>
        <Switch 
        checked={isDefault}
        onClick={handleDefaultChange}
        disabled={updatedDefaultLoading}
        />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          ${parseFloat(balance).toFixed(2)}
        </div>
        <p className="text-xs text-muted-foreground">
          {type.charAt(0) + type.slice(1).toLowerCase()} Account
        </p>
      </CardContent>
      <CardFooter className="flex justify-between text-sm text-muted-foreground">
        <div className="flex items-center">
          <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
          Income
        </div>
        <div className="flex items-center">
          <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
          Expense
        </div>
      </CardFooter>
      </Link>
    </Card>
  );
};

export default AccountCard;
