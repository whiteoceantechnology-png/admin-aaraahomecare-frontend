export const selectCustomerState = (state) => state.customer;
export const selectAllCustomers = (state) => state.customer.allCustomers;
export const selectSelectedCustomer = (state) => state.customer.selectedCustomer;
export const selectCustomerLoading = (state) => state.customer.loading;
export const selectCustomerDetailLoading = (state) => state.customer.detailLoading;
export const selectCustomerError = (state) => state.customer.error;
