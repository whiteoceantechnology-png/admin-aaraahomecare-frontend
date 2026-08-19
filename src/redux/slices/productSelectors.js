export const selectProductState = (state) => state.product;
export const selectAllProducts = (state) => state.product.products;
export const selectSingleProduct = (state) => state.product.singleProduct;
export const selectProductLoading = (state) => state.product.loading;
export const selectProductImporting = (state) => state.product.importing;
export const selectProductError = (state) => state.product.error;
