use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AccountDemoError {
    #[error("Account not initialized")]
    NotInitialized,
    
    #[error("Account already initialized")]
    AlreadyInitialized,
    
    #[error("Data type mismatch")]
    DataTypeMismatch,
    
    #[error("Not the account owner")]
    NotOwner,
    
    #[error("Invalid instruction data")]
    InvalidInstructionData,
    
    #[error("Name is too long")]
    NameTooLong,
    
    #[error("Message is too long")]
    MessageTooLong,
}

impl From<AccountDemoError> for ProgramError {
    fn from(e: AccountDemoError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
