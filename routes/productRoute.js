import express from "express";
import {
  getProductSuggestions,
  addProduct,
  getProductsByOwner,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";

const productRouter = express.Router();

productRouter.get("/suggestions/:userId", getProductSuggestions);
productRouter.get("/list/:userId", getProductsByOwner);
productRouter.post("/add", addProduct);
productRouter.put("/update/:productId", updateProduct);
productRouter.delete("/delete/:productId", deleteProduct);

export default productRouter;