import React from 'react'
import Footer from '../components/footer/Footer'
import { Link } from 'react-router-dom'
import AddNewBreadcrumb from '../components/breadcrumb/AddNewBreadcrumb'
import NewProductTitle from '../components/add-new-product/NewProductTitle'
import ProductDescription from '../components/add-new-product/ProductDescription'
import ProductData from '../components/add-new-product/ProductData'
import SeoData from '../components/add-new-product/SeoData'
import PublishedProduct from '../components/add-new-product/PublishedProduct'
import CategorySection from '../components/add-new-product/CategorySection'
import ProductTags from '../components/add-new-product/ProductTags'

const AddNewProduct = () => {
  return (
    <div className="main-content">
        <AddNewBreadcrumb link={"/allProduct"} title={'Add New Product'}/>
        <div className="row g-4">
            <div className="col-xxl-9 col-lg-8">
                <NewProductTitle/>
                <ProductDescription/>
                <ProductData/>
                <SeoData/>
            </div>
            <div className="col-xxl-3 col-lg-4 add-product-sidebar">
                <div className="mb-30 w-100">
                    <Link to="#" className="btn btn-primary d-block">Preview Changed</Link>
                </div>
                <PublishedProduct/>
                <CategorySection/>
                <ProductTags/>
            </div>
        </div>

        <Footer/>
    </div>
  )
}

export default AddNewProduct