
const Blockchain = require('./blockchain');
const express = require('express');
const app = express();
const uuid = require('uuid/v1');
const port = process.argv[2];
const nodeAddress = uuid().split('-').join('');
const rp = require('request-promise');


const healthblockchain = new Blockchain() ;

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

 
app.get('/blockchain', function (req, res) {
	res.send(healthblockchain);


  
});

app.post('/transaction', function(req, res){

	const newTransaction = req.body;


	const blockIndex = healthblockchain.addTransactionToPendingTransactions(newTransaction);

	
	res.json({ note: `Transaction will be added in block ${blockIndex}.`})

	
});





app.post('/transaction/broadcast', function(req, res) {
	const newTransaction = healthblockchain.createNewTransactions(req.body.encryptedEhr, req.body.sender, req.body.recipient);
	healthblockchain.addTransactionToPendingTransactions(newTransaction);

	const requestPromises = [];
	healthblockchain.networkNodes.forEach(networkNodeUrl => {
		const requestOptions = {
			uri: networkNodeUrl + '/transaction',
			method: 'POST',
			body: newTransaction,
			json: true
		};

		requestPromises.push(rp(requestOptions));
	});

	Promise.all(requestPromises)
	.then(data => {
		res.json({ note: 'Transaction created and broadcast successfully.' });
	});
});

app.get('/mine', function(req, res){

	const lastBlock = healthblockchain.getLastBlock();
	const previousBlockHash = lastBlock['hash'];
	const currentBlockData = {
		transactions: healthblockchain.pendingTransactions, 
		index: lastBlock['index'] + 1

	};
	const nonce = healthblockchain.proofOfWork(previousBlockHash, currentBlockData);
	const blockHash = healthblockchain.hashBlock(previousBlockHash, currentBlockData, nonce);


	const requestPromises = [];


	const newBlock = healthblockchain.createNewBlock(nonce, previousBlockHash, blockHash);

	healthblockchain.networkNodes.forEach(networkNodeUrl => {
		const requestOptions = {

			uri: networkNodeUrl + '/receive-new-block',
			method : 'POST',
			body : { newBlock: newBlock }, 

			json : true

		};

		requestPromises.push(rp(requestOptions));

	});
	Promise.all(requestPromises)
	.then(data => {

		const requestOptions = {
			uri: healthblockchain.currentNodeUrl + '/transaction/broadcast',
			method: 'POST',
			body : { 
				encrypterEhr: 0000,
				sender : "0000",
				recipient : nodeAddress
			 },
			 json : true
		};

		return rp(requestOptions);

	});






	
	res.json({
		note: "New Block Mined and Broadcast Successfully",
		block: newBlock
	});

});

// register a node and broadcast it on the network
app.post('/register-and-broadcast-node', function(req, res) {
	const newNodeUrl = req.body.newNodeUrl;
	if (healthblockchain.networkNodes.indexOf(newNodeUrl) == -1) healthblockchain.networkNodes.push(newNodeUrl);

	const regNodesPromises = [];
	healthblockchain.networkNodes.forEach(networkNodeUrl => {
		const requestOptions = {
			uri: networkNodeUrl + '/register-node',
			method: 'POST',
			body: { newNodeUrl: newNodeUrl },
			json: true
		};

		regNodesPromises.push(rp(requestOptions));
	});

	Promise.all(regNodesPromises)
	.then(data => {
		const bulkRegisterOptions = {
			uri: newNodeUrl + '/register-nodes-bulk',
			method: 'POST',
			body: { allNetworkNodes: [ ...healthblockchain.networkNodes, healthblockchain.currentNodeUrl ] },
			json: true
		};

		return rp(bulkRegisterOptions);
	})
	.then(data => {
		res.json({ note: 'New node registered with network successfully.' });
	});
});

//register a node with the network


app.post('/register-node', function(req, res) {
	const newNodeUrl = req.body.newNodeUrl;
	const nodeNotAlreadyPresent = healthblockchain.networkNodes.indexOf(newNodeUrl) == -1;
	const notCurrentNode = healthblockchain.currentNodeUrl !== newNodeUrl;
	if (nodeNotAlreadyPresent && notCurrentNode) healthblockchain.networkNodes.push(newNodeUrl);
	res.json({ note: 'New node registered successfully.' });
});


// register multiple nodes at once
app.post('/register-nodes-bulk', function(req, res) {
	const allNetworkNodes = req.body.allNetworkNodes;
	allNetworkNodes.forEach(networkNodeUrl => {
		const nodeNotAlreadyPresent = healthblockchain.networkNodes.indexOf(networkNodeUrl) == -1;
		const notCurrentNode = healthblockchain.currentNodeUrl !== networkNodeUrl;
		if (nodeNotAlreadyPresent && notCurrentNode) healthblockchain.networkNodes.push(networkNodeUrl);
	});

	res.json({ note: 'Bulk registration successful.' });
});


app.post('/receive-new-block', function(req, res){

	const newBlock = req.body.newBlock;
	const lastBlock = healthblockchain.getLastBlock();
	const correctHash = lastBlock.hash === newBlock.previousBlockHash;
	const correctIndex = lastBlock['index'] + 1 === newBlock['index'];

	if (correctHash && correctIndex) {
		healthblockchain.chain.push(newBlock);
		healthblockchain.pendingTransactions= [];
		res.json({
			note:'New Block received and accepted',
			newBlock: newBlock

		});
	} else {
		res.json({
			note: 'New Block rejected',
			newBlock : newBlock
		})
	}




});




app.get('/consensus', function(req, res){
	const requestPromises =[];

	healthblockchain.networkNodes.forEach(networkNodeUrl=> {
		const requestOptions = {
			uri : networkNodeUrl + '/blockchain',
			method : 'GET',
			json : true
		};

		requestPromises.push(rp(requestOptions));


	});

	Promise.all(requestPromises)
	.then(blockchains => {

		const currentChainLength = healthblockchain.chain.length;
		let maxChainLength = currentChainLength;
		let newLongestChain = null;
		let newPendingTransactions = null;
		blockchains.forEach(blockchain => {
			if(blockchain.chain.length > maxChainLength){
				maxChainLength = blockchain.chain.length;
				newLongestChain = blockchain.chain;
				newPendingTransactions = blockchain.pendingTransactions;




			};



		});


		if (!newLongestChain || newLongestChain && !healthblockchain.chainIsValid(newLongestChain)){

			res.json({
				note : 'Current Chain Has Not been Replaced.',
				chain: healthblockchain.chain
			});
		}
		else {
			healthblockchain.chain = newLongestChain;
			healthblockchain.pendingTransactions = newPendingTransactions;
			res.json({
				note: 'This chain has been Replaced',
				chain : healthblockchain.chain

			})
		}




	});



});



app.get('/block/:blockHash', function(req, res){

	const blockHash = req.params.blockHash;
	const correctBlock = healthblockchain.getBlock(blockHash);
	res.json({
		block: correctBlock
	});


});

app.get('transaction/:transactionId', function(req, res){

	const transactionId = req.params.transactionId;
	const transactionData = healthblockchain.getTransaction(transactionId);
	res.json ({
		transaction: transactionData.transaction,
		block: transactionData.block

	});


});

app.get('address/:address', function(req, res){

	const address = req.params.address;
	const addressData = healthblockchain.getAddressData(address);
	res.json ({
		addressData: addressData

	});

});

app.get('/block-explorer', function(req, res){

	res.sendFile('./block-explorer/index.html', { root : __dirname });

});




 
app.listen(port, function(){

	console.log(`Listening on port ${port}..`);
});


process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', reason.stack || reason)
 
})
