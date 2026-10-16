import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface IGrocery {
    _id: string,
    name: string,
    category: string,
    price: string,
    unit: string,
    quantity: number,
    image?: string,
    store?: string,      // which store this item belongs to
    createdAt?: Date,
    updatedAt?: Date
}

interface ICartSlice{
   cartData:IGrocery[],
   cartStoreId: string | null,    // locked to one store at a time
   cartStoreName: string | null,
   subTotal:number,
   deliveryFee:number,
   finalTotal:number
}


const initialState:ICartSlice={
   cartData:[],
   cartStoreId: null,
   cartStoreName: null,
   subTotal:0,
   deliveryFee:40,
   finalTotal:40
}

const cartSlice=createSlice({
   name:"cart",
   initialState ,
   reducers:{
    addToCart:(state,action:PayloadAction<IGrocery & { storeId?: string; storeName?: string }>)=>{ 
       const { storeId, storeName, ...groceryItem } = action.payload
       // If cart is empty or same store, add normally
       if (!state.cartStoreId || state.cartStoreId === storeId) {
           if (storeId && !state.cartStoreId) {
               state.cartStoreId = storeId
               state.cartStoreName = storeName || null
           }
           state.cartData.push(groceryItem) 
       }
       // Different store: clear cart and start fresh (caller should confirm first)
       else {
           state.cartData = [groceryItem]
           state.cartStoreId = storeId || null
           state.cartStoreName = storeName || null
       }
       cartSlice.caseReducers.calculateTotals(state)
    },
    clearCartForNewStore:(state, action: PayloadAction<{ storeId: string; storeName: string; item: IGrocery }>)=>{
        state.cartData = [{ ...action.payload.item, quantity: 1 }]
        state.cartStoreId = action.payload.storeId
        state.cartStoreName = action.payload.storeName
        cartSlice.caseReducers.calculateTotals(state)
    },
    increaseQuantity:(state,action:PayloadAction<string>)=>{
        const item=state.cartData.find(i=>i._id==action.payload)
        if(item){
         item.quantity=item.quantity + 1
        }
         cartSlice.caseReducers.calculateTotals(state)
    }
    ,
    decreaseQuantity:(state,action:PayloadAction<string>)=>{
      const item=state.cartData.find(i=>i._id==action.payload)
  if(item?.quantity && item.quantity>1){
   item.quantity=item.quantity-1
  }else{
   state.cartData=state.cartData.filter(i=>i._id!==action.payload)
  }
  if(state.cartData.length===0){
      state.cartStoreId = null
      state.cartStoreName = null
  }
 cartSlice.caseReducers.calculateTotals(state)
    },
    removeFromCart:(state,action:PayloadAction<string>)=>{
       state.cartData=state.cartData.filter(i=>i._id!==action.payload)
       if(state.cartData.length===0){
           state.cartStoreId = null
           state.cartStoreName = null
       }
        cartSlice.caseReducers.calculateTotals(state)
    },
    clearCart:(state)=>{
        state.cartData = []
        state.cartStoreId = null
        state.cartStoreName = null
        state.subTotal = 0
        state.deliveryFee = 40
        state.finalTotal = 40
    },
    calculateTotals:(state)=>{
      state.subTotal=state.cartData.reduce((sum,item)=>sum +Number(item.price)*item.quantity,0)
      state.deliveryFee=state.subTotal>100?0:40
      state.finalTotal=state.subTotal + state.deliveryFee
    }
   }
})

export const {addToCart,increaseQuantity,decreaseQuantity,removeFromCart,clearCart,clearCartForNewStore}=cartSlice.actions
export default cartSlice.reducer
