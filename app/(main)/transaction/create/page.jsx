import { getUserAccounts } from "@/actions/dashboard";
import { defaultCategories } from "@/data/categories";
import { AddTransactionForm } from "../_components/transaction-form";
import { getTransaction } from "@/actions/transaction";

const AddTransactionPage = async ({searchParams}) => {
  const accounts = await getUserAccounts();

  const editId = searchParams?.edit;

  let initData = null;
  if(editId){
    initData = await getTransaction(editId);
  }
  
    return (
    <div className="max-w-3xl mx-auto px-5">
      <div className="flex justify-center md:justify-normal mb-8">
        <h1 className="text-5xl gradient-title ">{editId ? "Edit Transaction" : "Add Transaction"}</h1>
      </div>
        <AddTransactionForm 
            accounts={accounts}
            categories={defaultCategories}
            editMode={!!editId}
            initData={initData}
        />
    </div>
  )
}

export default AddTransactionPage