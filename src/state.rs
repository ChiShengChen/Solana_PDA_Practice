use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{program_error::ProgramError, pubkey::Pubkey};
use crate::error::AccountDemoError;

/// Data structure stored in the Solana account
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct UserData {
    pub is_initialized: bool,
    pub owner: [u8; 32],  // Store Pubkey as a byte array
    pub name: String,
    pub message: String,
    pub update_count: u64,
}

impl UserData {
    pub const MAX_NAME_LENGTH: usize = 64;
    pub const MAX_MESSAGE_LENGTH: usize = 256;
    
    pub fn get_size(name: &str, message: &str) -> usize {
        1 +    // is_initialized: bool (1 byte)
        32 +   // owner: [u8; 32] (32 bytes)
        4 +    // name length: String length prefix (4 bytes)
        name.len() +  // name content
        4 +    // message length: String length prefix (4 bytes)
        message.len() +  // message content
        8      // update_count: u64 (8 bytes)
    }
    
    pub fn new(owner: Pubkey, name: String, message: String) -> Result<Self, ProgramError> {
        if name.len() > Self::MAX_NAME_LENGTH {
            return Err(AccountDemoError::NameTooLong.into());
        }
        if message.len() > Self::MAX_MESSAGE_LENGTH {
            return Err(AccountDemoError::MessageTooLong.into());
        }
        
        Ok(Self {
            is_initialized: true,
            owner: owner.to_bytes(),  // Convert Pubkey to bytes
            name,
            message,
            update_count: 1,
        })
    }
    
    pub fn get_owner(&self) -> Pubkey {
        Pubkey::new_from_array(self.owner)  // Convert byte array back to Pubkey
    }

    // Custom method to deserialize account data
    pub fn safe_deserialize(data: &[u8]) -> Result<Self, ProgramError> {
        // Read only what we need and ignore the rest
        let mut user_data = Self::try_from_slice(data)
            .map_err(|_| AccountDemoError::DataTypeMismatch)?;
        
        Ok(user_data)
    }
}

pub trait StringPad {
    fn pad_right(&self, length: usize, pad_char: char) -> String;
}

impl StringPad for String {
    fn pad_right(&self, length: usize, pad_char: char) -> String {
        let mut result = self.clone();
        while result.len() < length {
            result.push(pad_char);
        }
        result
    }
}
