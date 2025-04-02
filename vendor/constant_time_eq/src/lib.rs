//! Compares two equal-sized byte strings in constant time.
//!
//! This crate provides an implementation of constant-time comparison to
//! prevent timing attacks.

#![no_std]

/// Compares two equal-sized byte strings in constant time.
///
/// This function returns `true` if the two slices are equal, and `false`
/// if they are not. The comparison is done in constant time, which means
/// the time it takes to compare does not depend on the values being compared.
/// This helps prevent timing attacks.
///
/// # Examples
///
/// ```
/// use constant_time_eq::constant_time_eq;
///
/// let a = [0, 1, 2];
/// let b = [0, 1, 2];
/// let c = [0, 1, 3];
///
/// assert!(constant_time_eq(&a, &b));
/// assert!(!constant_time_eq(&a, &c));
/// ```
#[inline]
pub fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }

    let mut result = 0;
    for (x, y) in a.iter().zip(b.iter()) {
        result |= x ^ y;
    }
    result == 0
}

/// The `constant_time_eq_in_variable_time!` macro compares two equal-sized
/// byte strings in constant time, but only if they are the same length.
///
/// This is a convenience macro that can be used when the length check
/// does not need to be constant-time but the content comparison does.
///
/// # Examples
///
/// ```
/// use constant_time_eq::constant_time_eq_in_variable_time;
///
/// let a = [0, 1, 2];
/// let b = [0, 1, 2];
/// let c = [0, 1, 3];
///
/// assert!(constant_time_eq_in_variable_time!(&a, &b));
/// assert!(!constant_time_eq_in_variable_time!(&a, &c));
/// ```
#[macro_export]
macro_rules! constant_time_eq_in_variable_time {
    ($a:expr, $b:expr) => {{
        let a = $a;
        let b = $b;
        a.len() == b.len() && $crate::constant_time_eq(a, b)
    }};
}

/// Compares two values for equality in constant time.
///
/// This trait is implemented for common types that need constant-time
/// equality comparison, such as byte slices.
pub trait ConstantTimeEq {
    /// Compares two values for equality in constant time.
    ///
    /// This method returns `true` if the two values are equal, and `false`
    /// if they are not. The comparison is done in constant time, which means
    /// the time it takes to compare does not depend on the values being compared.
    fn ct_eq(&self, other: &Self) -> bool;
}

impl<'a, 'b> ConstantTimeEq for &'a [u8] {
    #[inline]
    fn ct_eq(&self, other: &&'b [u8]) -> bool {
        constant_time_eq(*self, *other)
    }
}

impl ConstantTimeEq for [u8] {
    #[inline]
    fn ct_eq(&self, other: &[u8]) -> bool {
        constant_time_eq(self, other)
    }
}

impl ConstantTimeEq for Vec<u8> {
    #[inline]
    fn ct_eq(&self, other: &Vec<u8>) -> bool {
        constant_time_eq(self.as_slice(), other.as_slice())
    }
} 