// Thin wrappers around react-redux's useDispatch/useSelector.
// Existing components may keep using useDispatch/useSelector directly —
// these are provided so new/refactored code has a single conventional
// entry point, per Redux Toolkit's recommended pattern.
import { useDispatch, useSelector } from "react-redux";

/** @returns {import("@reduxjs/toolkit").ThunkDispatch} */
export const useAppDispatch = () => useDispatch();

/**
 * @template T
 * @param {(state: import("./rootReducer").RootState) => T} selector
 * @returns {T}
 */
export const useAppSelector = (selector) => useSelector(selector);
