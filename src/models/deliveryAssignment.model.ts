import mongoose from "mongoose";

export interface IDeliveryAssigment{
    _id?:mongoose.Types.ObjectId
    order:mongoose.Types.ObjectId
    brodcastedTo:mongoose.Types.ObjectId[]
    rejectedBy?:mongoose.Types.ObjectId[]
    assignedTo:mongoose.Types.ObjectId | null
    status:"brodcasted" | "assigned" | "completed"
    acceptedAt:Date
    createdAt?:Date
    updatedAt?:Date
}

const deliveryAssignmentSchema=new mongoose.Schema<IDeliveryAssigment>({
    order:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Order"
    },
    brodcastedTo:[
        {
           type:mongoose.Schema.Types.ObjectId,
           ref:"User"  
        }
    ],
    rejectedBy:[
        {
           type:mongoose.Schema.Types.ObjectId,
           ref:"User"  
        }
    ],
    assignedTo:{
           type:mongoose.Schema.Types.ObjectId,
           ref:"User"
    },
    status:{
        type:String,
        enum:["brodcasted","assigned" , "completed"],
        default:"brodcasted"
    },
    acceptedAt:{
        type:Date
    }
},{timestamps:true})


deliveryAssignmentSchema.index({ assignedTo: 1, status: 1 });
deliveryAssignmentSchema.index({ brodcastedTo: 1, status: 1 });
deliveryAssignmentSchema.index({ order: 1 });

const DeliveryAssignment=mongoose.models.DeliveryAssignment || mongoose.model("DeliveryAssignment",deliveryAssignmentSchema)

export default DeliveryAssignment