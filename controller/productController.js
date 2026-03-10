import React, { useState } from "react";
import axiosInstance from "../../axiosConfig";

const AddProduct = () => {

const [name,setName]=useState("")
const [price,setPrice]=useState("")
const [oldPrice,setOldPrice]=useState("")
const [description,setDescription]=useState("")
const [hsn,setHsn]=useState("")
const [sku,setSku]=useState("")
const [length,setLength]=useState("")
const [width,setWidth]=useState("")
const [height,setHeight]=useState("")
const [weight,setWeight]=useState("")
const [maincategory,setMainCategory]=useState("")
const [subcategory,setSubCategory]=useState("")

const [coverImage,setCoverImage]=useState(null)

const [sizes,setSizes]=useState([
{
size:"",
colors:[
{
color:"",
images:[],
stock:0
}
]
}
])

const handleSubmit = async(e)=>{

e.preventDefault()

const formData = new FormData()

formData.append("name",name)
formData.append("price",price)
formData.append("oldPrice",oldPrice)
formData.append("description",description)
formData.append("hsn",hsn)
formData.append("sku",sku)
formData.append("length",length)
formData.append("width",width)
formData.append("height",height)
formData.append("weight",weight)

formData.append("maincategory",maincategory)
formData.append("subcategory",subcategory)

formData.append("coverImage",coverImage)

formData.append("sizes",JSON.stringify(sizes))

await axiosInstance.post("/products/add",formData)

alert("Product added successfully")

}

return(

<form onSubmit={handleSubmit}>

<input
type="text"
placeholder="Product Name"
value={name}
onChange={(e)=>setName(e.target.value)}
/>

<input
type="number"
placeholder="Price"
value={price}
onChange={(e)=>setPrice(e.target.value)}
/>

<input
type="number"
placeholder="Old Price"
value={oldPrice}
onChange={(e)=>setOldPrice(e.target.value)}
/>

<input
type="text"
placeholder="HSN"
value={hsn}
onChange={(e)=>setHsn(e.target.value)}
/>

<input
type="text"
placeholder="SKU"
value={sku}
onChange={(e)=>setSku(e.target.value)}
/>

<textarea
placeholder="Description"
value={description}
onChange={(e)=>setDescription(e.target.value)}
/>

<input type="file"
onChange={(e)=>setCoverImage(e.target.files[0])}
/>

<input
type="number"
placeholder="Length"
onChange={(e)=>setLength(e.target.value)}
/>

<input
type="number"
placeholder="Width"
onChange={(e)=>setWidth(e.target.value)}
/>

<input
type="number"
placeholder="Height"
onChange={(e)=>setHeight(e.target.value)}
/>

<input
type="number"
placeholder="Weight"
onChange={(e)=>setWeight(e.target.value)}
/>

<button type="submit">
Add Product
</button>

</form>

)

}

export default AddProduct