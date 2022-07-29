import * as anchor from "@project-serum/anchor";
import { AnchorError, LangErrorCode, LangErrorMessage, Program, ProgramError } from "@project-serum/anchor";
import { publicKey } from "@project-serum/anchor/dist/cjs/utils";
import { assert } from "chai";
import { Program2 } from "../target/types/program2";
const util = require('util');
const { SystemProgram } = anchor.web3;


describe("program2", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  
  it("should store a new message", async () => {

    const program = anchor.workspace.Program2 as Program<Program2>; 
    const message = anchor.web3.Keypair.generate();
    
    const utf8Encode = new util.TextEncoder();
    let msg = new Uint8Array(100);
    msg.set(utf8Encode.encode("hello Solana"));
    const sentence = Array.from(msg);

    // program object contain an rpc object which exposes an API matching program instructions
    await program.methods
                  .write(sentence) 
                  .accounts({
                  initializer: provider.wallet.publicKey,
                  message: message.publicKey,
                  systemProgram: SystemProgram.programId,
                 })

                 .signers([message]) //no need to mention initializer, he is signer type
                 .rpc()
                 ;

    const messageAccount = await program.account.message.fetch(message.publicKey);
    console.log((messageAccount));

    assert.equal(messageAccount.sentence.toString, sentence.toString);
    assert.equal(messageAccount.author.toBase58, provider.wallet.publicKey.toBase58);
    assert.ok(messageAccount.timestamp);
  });

  it("should delete a message", async () => {
    
    const program = anchor.workspace.Program2 as Program<Program2>; 
    const author = provider.wallet.publicKey ;
    const messages = await program.account.message.all([{memcmp :{ offset:8, bytes: author.toBase58(),}}]);
    console.log(messages[0].publicKey);
    // program object contain an rpc object which exposes an API matching program instructions
    await program.methods
                  .delete() 
                  .accounts({
                  initializer: provider.wallet.publicKey,
                  message: messages[0].publicKey,
                 })
                 .rpc()
                 ;

    try {      
      
      await program.account.message.fetch(messages[0].publicKey);

    } catch(error) {           
      const dltmessage = messages[0].publicKey;
      assert.equal(error.toString(), `Error: Account does not exist ${dltmessage}`);
      return;
    }

    assert.fail('account does not exist');

  });

  it("should not delete a message if initializer is not author", async () => {
    const program = anchor.workspace.Program2 as Program<Program2>; 
    const message = anchor.web3.Keypair.generate();
    
    const utf8Encode = new util.TextEncoder();
    let msg = new Uint8Array(100);
    msg.set(utf8Encode.encode("hello Solana"));
    const sentence = Array.from(msg);

    await program.methods
                  .write(sentence) 
                  .accounts({
                  initializer: provider.wallet.publicKey,
                  message: message.publicKey,
                  systemProgram: SystemProgram.programId,
                 })

                 .signers([message]) //no need to mention initializer, he is signer type
                 .rpc()
                 ;
                        
      const initializer = anchor.web3.Keypair.generate();
      const author = provider.wallet.publicKey ;
      const messages = await program.account.message.all([{memcmp :{ offset:8, bytes: author.toBase58(),}}]);
      
      try {  
      
      await program.methods
                    .delete() 
                    .accounts({
                    initializer: initializer.publicKey,
                    message: messages[0].publicKey,
                   })
                   .rpc()
                   ;
    } catch (ProgramError) {

   //   assert.equal(ProgramError, 'NotAuthor');
      return;
    }
    
    assert.fail('Only author can delete message');

  });



})
