// Root state key is "allReviews" (see rootReducer.js) even though the slice name is "AllReview".
export const selectReviewState = (state) => state.allReviews;
export const selectAllDeleteReviewRequest = (state) =>
  state.allReviews.allDeleteReviewRequest;
export const selectReviewLoading = (state) => state.allReviews.loading;
export const selectReviewError = (state) => state.allReviews.error;
