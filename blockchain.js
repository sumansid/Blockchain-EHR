const sha256 = require('sha256');
//const blake = require('blake-hash');
const currentNodeUrl = process.argv[3];
const uuid = require('uuid/v1');


function Blockchain(){
	this.chain = [];
	this.pendingtransactions = [];

	this.currentNodeUrl = currentNodeUrl;
	this.networkNodes = [];

	//genesis Block

	this.createNewBlock(100, '0', '0');

}

Blockchain.prototype.createNewBlock = function(nonce, previousBlockHash, hash){
	const newBlock = {
		index: this.chain.length + 1,
		timestamp: Date.now(),
		transactions: this.pendingtransactions,
		nonce : nonce,
		hash: hash,
		previousBlockHash: previousBlockHash

	};

	this.pendingtransactions = [];
	this.chain.push(newBlock);
	return newBlock;


}

Blockchain.prototype.getLastBlock = function(){
	return this.chain[this.chain.length-1];
}

Blockchain.prototype.createNewTransactions = function(encrypterEhr, sender, recipient){

	const newTransaction = {
		encrypterEhr: encrypterEhr,
		sender: sender,
		recipient: recipient,
		transactionId: uuid().split('-').join('')

	};

	return newTransaction;



};

Blockchain.prototype.addTransactionToPendingTransactions = function(transactionObj){

	this.pendingtransactions.push(transactionObj);
	return this.getLastBlock()['index'] + 1;

};

Blockchain.prototype.hashBlock = function(previousBlockHash, currentBlockData, nonce){
	const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
	const hash = sha256(dataAsString);
	return hash;
};

Blockchain.prototype.proofOfWork = function(previousBlockHash, currentBlockData){

	let nonce = 0;
	let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
	while (hash.substring(0,4) !== '0000') {
		nonce ++ ;
		hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
	}

	return nonce;


};




// consensus algorithm
Blockchain.prototype.chainIsValid = function(blockchain) {

	let validChain = true;

	for (var i = 1; i< blockchain.length; i++){

		const currentBlock = blockchain[i];
		const previousBlock = blockchain[i-1];
		const blockHash = this.hashBlock(previousBlock['hash'], {transactions : currentBlock['transactions'], index : currentBlock[index]}, 
			currentBlock['nonce']);

		// validation of block data using the hash property 

		if(blockHash.substring(0, 4) !== '0000') {
			validChain = false ;
		}
		const genesisBlock = blockchain[0];
		const correctNonce = genesisBlock['nonce'] === 100;
		const correctPreviousBlockHash = genesisBlock['previousBlockHash'] === '0';
		const correctHash = genesisBlock['hash'] === '0';
		const correctTransactions = genesisBlock['transactions'].legnth === 0;

		if (!correctNonce || !correctPreviousBlockHash || !correctHash || !correctTransactions){
			validChain = false ;
		}

		// if the blocks are invalid

		if (currentBlock['previousBlock'] !== previousBlock['hash']) {

			validChain = false;

		}
	}
	return validChain;
};





Blockchain.prototype.getBlock = function(blockHash){

	let correctBlock = null;
	this.chain.forEach(block =>{
		if(block.hash = blockHash) correctBlock = block;



	});

	return correctBlock;

};

Blockchain.prototype.getTransaction = function(transactionId){

	let correctTransaction = null;
	let correctBlock = null;
	this.chain.forEach(block => {

		block.transactions.forEach(transaction => {

			if(transaction.transactionId === transactionId){
				correctTransaction = transaction;
				correctBlock = block;

			};



		});
		
	});


	return {
		transaction : correctTransaction,
		block : correctBlock
	}
};


Blockchain.prototype.getAddressData = function(address){
	const addressTransactions = [];
	this.chain.forEach(block => {

		block.transactions.forEach(transaction => {
			if(transaction.sender === address || transaction.recipient === address){
				addressTransactions.push(transaction);

			};

		});

	});

	let balance = 0;
	addressTransactions.forEach(transaction =>{
		if(transaction.recipient === address) balance += transaction.encrypterEhr;
		else if(transaction.recipient === address) balance -= transaction.encrypterEhr;
	});


	return {
		addressTransactions : addressTransactions,
		addressBalance : balance
	}



};



module.exports = Blockchain;
