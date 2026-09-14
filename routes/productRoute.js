import express from "express";
import {
  getProductSuggestions,
  addProduct,
  getProductsByOwner,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import authUser from "../middlewares/authUser.js";

const productRouter = express.Router();

productRouter.get("/suggestions/:userId", authUser, getProductSuggestions);
productRouter.get("/list/:userId", authUser, getProductsByOwner);
productRouter.post("/add", authUser, addProduct);
productRouter.put("/update/:productId", authUser, updateProduct);
productRouter.delete("/delete/:productId", authUser, deleteProduct);

export default productRouter;