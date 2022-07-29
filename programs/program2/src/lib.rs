use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;
//declare program id
declare_id!("B9fCRaaFUtSRoxEVJhCWCAgoMydZZq6iBeMqMzU3RYjY");

//custom errors
#[error_code]
pub enum ErrorCode {
    #[msg("Only author can delete message")]
    NotAuthor,
}
//2. business logic
#[program]
pub mod program2 {
    use super::*;

    pub fn write(ctx: Context<Write>, sentence:[u8;100]) -> Result<()> {
        //retrieve info from ctx
        let message:&mut Account<Message> = &mut ctx.accounts.message; // ctx. syntax to access to message account, already initalized by init constraint
        let author: &Signer = &ctx.accounts.initializer;
        let clock: Clock = Clock::get()?;
        
        message.author = *author.key;
        message.sentence = sentence;
        message.timestamp = clock.unix_timestamp;

        Ok(())
    }

    pub fn delete(ctx: Context<Delete>) -> Result<()> {
        //retrieve info from ctx
        let message:&mut Account<Message> = &mut ctx.accounts.message; // ctx. syntax to access to message account, already initalized by init constraint
        require_keys_eq!(ctx.accounts.initializer.key(), ctx.accounts.message.author, ErrorCode::NotAuthor);
        
        Ok(())
    }
}

// define data structure stored by message account
#[account]
#[derive(Debug)]
pub struct Message {
    pub author: Pubkey,
    pub sentence: [u8;100],
    pub timestamp: i64,
}

impl Message {
    // sizing message account (sum of each field + 8 to store the discriminator)
    const LEN: usize = 8 + 32 + 100 + 8;
}

//3. deserialization and validation of incoming accounts info

//define the context of an instruction 
#[derive(Accounts)] // derive attribut privided by Anchor
pub struct Write<'info> {//lifetime
    #[account(mut)] //a constraint, mutable to update his sol balance (is payer)
    pub initializer: Signer<'info>, //Signer: type of signer account
    #[account(init, payer = initializer, space = Message::LEN)] //init constraint to create account, call the syst prog create_account instruction
    pub message: Account<'info, Message>, // account to store message, it is an account of type Message, so the data will be parsed accordingly
    #[account(address = system_program::ID)] //constraint to check the sys prog ID  
    pub system_program: Program<'info, System>, //system program account
    
}

#[derive(Accounts)] // derive attribut privided by Anchor
pub struct Delete<'info> {//lifetime
    #[account(mut)] //a constraint, mutable to update his sol balance (is payer)
    pub initializer: Signer<'info>, //Signer: type of signer account
    #[account(mut, close = initializer, constraint= initializer.key() == message.author @ErrorCode::NotAuthor)] //close constraint to close account at the end of the instruction
    pub message: Account<'info, Message>, // account to store message, it is an account of type Message, so the data will be parsed accordingly
    
}


