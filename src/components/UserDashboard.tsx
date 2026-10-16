import React from 'react'
import HeroSection from './HeroSection'
import CategorySlider from './CategorySlider'
import { IGrocery } from '@/models/grocery.model'
import MyStoresSection from './MyStoresSection'

async function UserDashboard({ groceryList }: { groceryList: IGrocery[] }) {
  return (
    <>
      <HeroSection />
      <CategorySlider />
      {/* My Kirana Stores — the new core feature */}
      <MyStoresSection />

      {/* Optional: show a subtle "Browse all" section below stores */}
      {groceryList.length > 0 && (
        <div className="w-full max-w-7xl xl:max-w-[1550px] 2xl:max-w-[1750px] mx-auto px-3 sm:px-6 lg:px-8 mt-4 mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <p className="text-sm text-gray-400 dark:text-gray-500 whitespace-nowrap font-medium">
              or browse all available items
            </p>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      )}
    </>
  )
}

export default UserDashboard
