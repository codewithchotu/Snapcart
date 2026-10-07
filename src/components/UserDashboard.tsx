import React from 'react'
import HeroSection from './HeroSection'
import CategorySlider from './CategorySlider'
import connectDb from '@/lib/db'
import Grocery, { IGrocery } from '@/models/grocery.model'
import GroceryItemCard from './GroceryItemCard'

async function UserDashboard({groceryList}:{groceryList:IGrocery[]}) {
await connectDb()
const plainGrocery = JSON.parse(JSON.stringify(groceryList))

  return (
    <>
      <HeroSection/>
      <CategorySlider/>
      <div className='w-full max-w-7xl xl:max-w-[1550px] 2xl:max-w-[1750px] mx-auto px-3 sm:px-6 lg:px-8 mt-10 mb-16'>
        <h2 className='text-2xl md:text-3xl font-bold text-green-700 dark:text-green-400 mb-6 text-center'>Popular Grocery Items</h2>
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-5 lg:gap-6'> 
          {plainGrocery.map((item:any,index:number)=>(
            <GroceryItemCard key={index} item={item}/>
          ))}
        </div>
      </div>
     
    </>
  )
}

export default UserDashboard
