import React from 'react'
import DashboardPage from "./page";
import { Suspense } from "react";
import { BarLoader } from "react-spinners";

const DashBoardLayout = () => {
  return (
    <div className='px-5'>
      <h1 className="text-6xl font-bold gradient-title mb-5">
        Dashboard
      </h1>
    
      {/*Dashbaord Page*/}    
      <Suspense
        fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}
      >
        <DashboardPage />
      </Suspense>
    </div>
  )
}

export default DashBoardLayout