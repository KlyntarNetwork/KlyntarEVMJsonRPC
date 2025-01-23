/*

████████╗██╗  ██╗███████╗    ███╗   ███╗ ██████╗ ███████╗████████╗    ███╗   ██╗███████╗███████╗██████╗ ███████╗██████╗ 
╚══██╔══╝██║  ██║██╔════╝    ████╗ ████║██╔═══██╗██╔════╝╚══██╔══╝    ████╗  ██║██╔════╝██╔════╝██╔══██╗██╔════╝██╔══██╗
   ██║   ███████║█████╗      ██╔████╔██║██║   ██║███████╗   ██║       ██╔██╗ ██║█████╗  █████╗  ██║  ██║█████╗  ██║  ██║
   ██║   ██╔══██║██╔══╝      ██║╚██╔╝██║██║   ██║╚════██║   ██║       ██║╚██╗██║██╔══╝  ██╔══╝  ██║  ██║██╔══╝  ██║  ██║
   ██║   ██║  ██║███████╗    ██║ ╚═╝ ██║╚██████╔╝███████║   ██║       ██║ ╚████║███████╗███████╗██████╔╝███████╗██████╔╝
   ╚═╝   ╚═╝  ╚═╝╚══════╝    ╚═╝     ╚═╝ ╚═════╝ ╚══════╝   ╚═╝       ╚═╝  ╚═══╝╚══════╝╚══════╝╚═════╝ ╚══════╝╚═════╝ 


   Details:

   [+] https://klyntar.org/kly-evm/json-rpc2.0
   [+] https://ethereum.org/ru/developers/docs/apis/json-rpc
   [+] https://metamask.github.io/api-playground/api-documentation/
   [+] https://documenter.getpostman.com/view/4117254/ethereum-json-rpc/RVu7CT5J
   


*/

import {Transaction} from '@ethereumjs/tx'

import Web3 from 'web3'


//___________________________________Used on KLY symbiotes___________________________________


// MUST_HAVE________________________


METHODS_MAPPING.set('eth_chainId',_=>global.KLY_EVM_OPTIONS.chainId)


METHODS_MAPPING.set('eth_protocolVersion',_=>global.KLY_EVM_OPTIONS.protocolVersionInHex)


//Or do smth with VERIFICATION_THREAD | GENERATION_THREAD
METHODS_MAPPING.set('eth_syncing',_=>false)


//Returns the current price per gas in wei
//do it later(we should migrate to energy)
// + we'll add more advanced way to count
METHODS_MAPPING.set('eth_gasPrice',_=>global.KLY_EVM_OPTIONS.gasPriceInWeiAndHex)


METHODS_MAPPING.set('eth_blockNumber',()=>{

    let latestIndex = BigInt(global.KLY_EVM_METADATA.nextBlockIndex)-BigInt(1)

    return Web3.utils.toHex(latestIndex.toString())

})


// We'll take balances from local storage
METHODS_MAPPING.set('eth_getBalance',async params=>{

    let [address,quantityOrTag] = params

    let account = await global.KLY_EVM.getAccount(address).catch(_=>false)

    if(account){

        let balanceInHexAndInWei = Web3.utils.toHex(account.balance.toString())

        return balanceInHexAndInWei
    
    }else return {error:'Impossible to get account'}

})




// Returns the number of transactions sent from an address
METHODS_MAPPING.set('eth_getTransactionCount',async params=>{

    let [address,quantityOrTag] = params

    let account = await global.KLY_EVM.getAccount(address).catch(_=>false)

    if(account){

        let nonceInHex = Web3.utils.toHex(account.nonce.toString())

        return nonceInHex
    
    }else return {error:'Impossible to get account'}

})




// Returns the number of transactions in a block from a block matching the given block hash
METHODS_MAPPING.set('eth_getBlockTransactionCountByHash',params=>{

    let [_] = params

    return '0x1'

})




// Returns the number of transactions in a block with appropriate block height
METHODS_MAPPING.set('eth_getBlockTransactionCountByNumber',params=>{

    let [_] = params

    //Again - take from storage

    return '0x1'

})




// Returns code at a given address
METHODS_MAPPING.set('eth_getCode',async params=>{

    let [address,quantityOrTag] = params

    let account = await global.KLY_EVM.getAccount(address).catch(_=>false)

    if(account){

        let codeHash = '0x'+Buffer.from(account.codeHash).toString('hex')

        return codeHash    
    
    }else return {error:'Impossible to get account'}


})




/*

The sign method calculates an Ethereum specific signature with:
sign(keccak256('\x19Ethereum Signed Message:\n' + len(message) + message))).

*/
METHODS_MAPPING.set('eth_sign',params=>{

    let [address,message] = params

    return '0x'
    
    // Check if we have appropriate keys and sign

})




// Signs a transaction that can be submitted to the network at a later time using with
METHODS_MAPPING.set('eth_signTransaction',params=>{

    let [transaction] = params

    return '0x'

    // Check if we have appropriate keys and sign
    
})




// Creates new message call transaction or a contract creation, if the data field contains code
METHODS_MAPPING.set('eth_sendTransaction',params=>{

    let [txData] = params

    return '0x'

    // returns `0x${tx.hash().toString('hex')}`
    
})




//Creates new message call transaction or a contract creation for signed transactions
METHODS_MAPPING.set('eth_sendRawTransaction',async (params)=>{

    // The signed transaction data
    let [serializedTransactionInHexWith0x] = params


    // Execute in KLY-EVM sandbox(via runCall) to get the returnValue(if success). After all checks, we can add the tx to mempool and return a hash
    
    let result = await global.KLY_EVM.sandboxCall(serializedTransactionInHexWith0x).catch(_=>false)

    if(result){

        // It might be an error
        if(result.error) return {error:JSON.stringify(result)}

        // In case we're not the current leader - tx should be redirected to the CURRENT leader to be included to block immediately

        let whoIsCurrentLeader = await global.getCurrentLeaderURL() // {isMeCurrentLeader: bool, url(?)}

        if(whoIsCurrentLeader.isMeCurrentLeader){

            global.MEMPOOL.push({type:'EVM_CALL',payload:serializedTransactionInHexWith0x})

        } else if (!whoIsCurrentLeader.isMeCurrentLeader && whoIsCurrentLeader.url){

            const web3 = new Web3(`${whoIsCurrentLeader.url}/kly_evm_rpc`)

            // Send to target mempool

            web3.eth.sendSignedTransaction(serializedTransactionInHexWith0x, () => {})

        }

        try{

            let tx = Transaction.fromSerializedTx(Buffer.from(serializedTransactionInHexWith0x.slice(2),'hex'))

            return `0x${tx.hash().toString('hex')}`    

        } catch {

          return {error:'Impossible to parse transaction to get hash. Make sure tx format is ok'}  

        }
        
    }else return {error:'Impossible to run transaction in sandbox. Make sure tx format is ok'}


})




//Executes a new message call immediately without creating a transaction on the block chain
METHODS_MAPPING.set('eth_call',async params=>{

    let [transactionData] = params

    let executionResultInHex = await global.KLY_EVM.sandboxCall(transactionData,true).catch(_=>false)


    if(typeof executionResultInHex === 'string') return executionResultInHex
  
    else if(executionResultInHex.error) return {error:JSON.stringify(executionResultInHex)}

    else return {error:'Impossible to run transaction in sandbox. Make sure tx format is ok'}
  
    
})




//Generates and returns an estimate of how much gas is necessary to allow the transaction to complete
METHODS_MAPPING.set('eth_estimateGas',async params=>{

    let [txData] = params

    let gasRequiredInHexOrError = await global.KLY_EVM.estimateGasUsed(txData).catch(_=>false)


    if(typeof gasRequiredInHexOrError === 'string') return gasRequiredInHexOrError

    else if(gasRequiredInHexOrError.error) return {error:JSON.stringify(gasRequiredInHexOrError)}
    
    else return {error:'Impossible to run transaction in sandbox to estimate required amount of gas. Make sure tx format is ok'}
    
})




METHODS_MAPPING.set('eth_getBlockByNumber',async (params)=>{

    /*

        ______________________Must return______________________
    
        ✅number: QUANTITY - the block number. null when its pending block.
        ⌛️hash: DATA, 32 Bytes - hash of the block. null when its pending block.
        ✅parentHash: DATA, 32 Bytes - hash of the parent block.
        ✅nonce: DATA, 8 Bytes - hash of the generated proof-of-work. null when its pending block.
        ✅sha3Uncles: DATA, 32 Bytes - SHA3 of the uncles data in the block.
        ✅logsBloom: DATA, 256 Bytes - the bloom filter for the logs of the block. null when its pending block.
        ✅transactionsRoot: DATA, 32 Bytes - the root of the transaction trie of the block.
        ✅stateRoot: DATA, 32 Bytes - the root of the final state trie of the block.
        ✅receiptsRoot: DATA, 32 Bytes - the root of the receipts trie of the block.
        ✅miner: DATA, 20 Bytes - the address of the beneficiary to whom the mining rewards were given.
        ✅difficulty: QUANTITY - integer of the difficulty for this block.
        ⌛️totalDifficulty: QUANTITY - integer of the total difficulty of the chain until this block.
        ✅extraData: DATA - the "extra data" field of this block.
        ⌛️size: QUANTITY - integer the size of this block in bytes.
        ✅gasLimit: QUANTITY - the maximum gas allowed in this block.
        ✅gasUsed: QUANTITY - the total used gas by all transactions in this block.
        ✅timestamp: QUANTITY - the unix timestamp for when the block was collated.
        ✅transactions: Array - Array of transaction objects, or 32 Bytes transaction hashes depending on the last given parameter.
        ✅uncles: Array - Array of uncle hashes.
    

        ________________________Current________________________
        
        {
            header: {
                parentHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
                uncleHash: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
                coinbase: '0x0000000000000000000000000000000000000000',
                stateRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
                transactionsTrie: '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
                receiptTrie: '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
                logsBloom: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
                difficulty: '0x0',
                number: '0x0',
                gasLimit: '0xffffffffffffff',
                gasUsed: '0x0',
                timestamp: '0x1f21f020c9',
                extraData: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
                mixHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
                nonce: '0x0000000000000000'
            },

            transactions: [],
            uncleHeaders: []
        }


        _________________________TODO__________________________

        hash - '0x'+block.hash.toString('hex')
        uncleHash => sha3Uncles
        transactionsTrie => transactionsRoot
        receiptTrie => receiptsRoot
        coinbase => miner
        totalDifficulty - '0x0'
        size - '0x'
        uncleHeaders => uncles[]

        transactions - push the hashes of txs runned in this block

    */

        let [blockNumberInHex,fullOrNot] = params

        if(blockNumberInHex === 'latest'){
    
            let latestIndex = BigInt(global.KLY_EVM_METADATA.nextBlockIndex)-BigInt(1)
            
            blockNumberInHex = Web3.utils.toHex(latestIndex.toString())
    
        }
    
        let block = await global.STATE.get(`EVM_BLOCK:${blockNumberInHex}`).catch(_=>false)
    
        return block || {error:'No block with such index'}
    

})




METHODS_MAPPING.set('eth_getBlockByHash',async (params) =>{

    /*
    
    See eth_getBlockByNumber for info
    
    */

    let [blockHash,fullOrNot] = params

    let blockIndex = await global.STATE.get(`EVM_INDEX:${blockHash}`).catch(_=>false) // get the block index by its hash
   
    let block = await global.STATE.get(`EVM_BLOCK:${blockIndex}`).catch(_=>false)

    return block || {error:'No block with such hash'}
    
})




METHODS_MAPPING.set('eth_getTransactionByHash',async params=>{

    /*
    
        ______________________Must return______________________
        

        ⌛️blockHash: DATA, 32 Bytes - hash of the block where this transaction was in. null when its pending.
        ⌛️blockNumber: QUANTITY - block number where this transaction was in. null when its pending.
        
        ✅from: DATA, 20 Bytes - address of the sender.
        ✅gas: QUANTITY - gas provided by the sender.
        ✅gasPrice: QUANTITY - gas price provided by the sender in Wei.
        ⌛️hash: DATA, 32 Bytes - hash of the transaction.
        ✅input: DATA - the data send along with the transaction.
        ✅nonce: QUANTITY - the number of transactions made by the sender prior to this one.
        
        ✅to: DATA, 20 Bytes - address of the receiver. null when its a contract creation transaction.
        ✅transactionIndex: QUANTITY - integer of the transactions index position in the block. null when its pending.
        
        ✅value: QUANTITY - value transferred in Wei.
        
        ✅v: QUANTITY - ECDSA recovery id
        ✅r: QUANTITY - ECDSA signature r
        ✅s: QUANTITY - ECDSA signature s
    

        ________________________Current________________________

        {
            from(taken from signature,coz it's ECDSA)
            nonce: '0x1',
            gasPrice: '0x1',
            gasLimit: '0x1e8480',
            to: '0x61de9dc6f6cff1df2809480882cfd3c2364b28f7',
            value: '0x0',
            data: '0xa41368620000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000c486f6c612c204d756e646f210000000000000000000000000000000000000000',
            v: '0x2c',
            r: '0x4ec2e0779dae3cc60ed0be9918f1e95149297d36a04cfff5e5ef30ecaf834f06',
            s: '0x2753d83b5f83cd8d6897c8259286920f3f9d4fdb86e47ed2a37bdad6f791addb'
        
        }

        _____________________Add manually______________________

        blockHash - '0x'+block.hash().toString('hex')
        blockNumber - block.header.number(in hex)
        hash - '0x'+tx.hash().toString('hex')
        from - tx.getSenderAddress().toString()
        
    */

    let [txHash] = params

    let {tx} = await global.STATE.get('TX:'+txHash).catch(_=>false)

    return tx || {error:'No such transaction. Make sure that hash is ok'}
    
})




METHODS_MAPPING.set('eth_getTransactionByBlockNumberAndIndex',params=>{

    let [blockNumber,txIndex] = params

    return {error:'Not supported'}
    
})




// Take from vm deploymentResult.receipt
METHODS_MAPPING.set('eth_getTransactionReceipt',async params=>{

    /*
    
    ______________________Must return______________________


    ⌛️transactionHash : DATA, 32 Bytes - hash of the transaction.
    ⌛️transactionIndex: QUANTITY - integer of the transactions index position in the block.
    ⌛️blockHash: DATA, 32 Bytes - hash of the block where this transaction was in.
    ⌛️blockNumber: QUANTITY - block number where this transaction was in.
    ⌛️from: DATA, 20 Bytes - address of the sender.
    ⌛️to: DATA, 20 Bytes - address of the receiver. null when its a contract creation transaction.
    ✅cumulativeGasUsed : QUANTITY - The total amount of gas used when this transaction was executed in the block.
    ⌛️effectiveGasPrice : QUANTITY - The sum of the base fee and tip paid per unit of gas.
    ⌛️gasUsed : QUANTITY - The amount of gas used by this specific transaction alone.
    ⌛️contractAddress : DATA, 20 Bytes - The contract address created, if the transaction was a contract creation, otherwise null.
    ✅logs: Array - Array of log objects, which this transaction generated.
    ⌛️logsBloom: DATA, 256 Bytes - Bloom filter for light clients to quickly retrieve related logs.
    ⌛️type: DATA - integer of the transaction type, 0x00 for legacy transactions, 0x01 for access list types, 0x02 for dynamic fees. It also returns either :
    ⌛️root : DATA 32 bytes of post-transaction stateroot (pre Byzantium)
    ✅status: QUANTITY either 1 (success) or 0 (failure)
    

    ________________________Current________________________


    {
    
        status: 1,
        cumulativeBlockGasUsed: 25770n,
        bitvector: <Buffer 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 20 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ... 206 more bytes>,
        logs: []

    }


    _____________________Add manually______________________

    transactionHash - '0x'+tx.hash().toString('hex')
    transactionIndex - '0x0'
    blockHash - '0x'+block.hash().toString('hex')
    blockNumber - block.header.number (in hex)
    from - tx.getSenderAddress().toString()
    to - tx.to
    cumulativeGasUsed - convert to hex
    effectiveGasPrice - take from tx gasPrice tx.gasPrice
    gasUsed - take from tx execution result (result.execResult.executionGasUsed.toString())
    type - tx.type (convert to hex)
    contractAddress - take from tx (vm.runTx({tx,block}).createdAddress). Otherwise - set as null
    logsBloom - '0x'+receipt.bitvector.toString('hex')


    */

    let [txHash] = params

    let {receipt} = await global.STATE.get('TX:'+txHash).catch(_=>false)

    if(receipt){

        if(receipt.status === 1) receipt.status = "0x1"

        else receipt.status = "0x0"

    }

    return receipt || false


})




//Returns an array of all logs matching a given filter object
METHODS_MAPPING.set('eth_getLogs',async (params)=>{


    /*

        ____________________Filter options are____________________
        

        fromBlock: QUANTITY|TAG - (optional, default: "latest") Integer block number, or "latest" for the last mined block or "pending", "earliest" for not yet mined transactions.
        toBlock: QUANTITY|TAG - (optional, default: "latest") Integer block number, or "latest" for the last mined block or "pending", "earliest" for not yet mined transactions.
        address: DATA|Array, 20 Bytes - (optional) Contract address or a list of addresses from which logs should originate.
        topics: Array of DATA, - (optional) Array of 32 Bytes DATA topics. Topics are order-dependent. Each topic can also be an array of DATA with "or" options.
        blockhash: DATA, 32 Bytes - (optional, future) With the addition of EIP-234, blockHash will be a new filter option which restricts the logs returned to the single block with the 32-byte hash blockHash. Using blockHash is equivalent to fromBlock = toBlock = the block number with hash blockHash. If blockHash is present in the filter criteria, then neither fromBlock nor toBlock are allowed.
    

        ___________________Example of response____________________

    [
        {
            ⌛️address: '0x15ecf34ECDb72bAfd3DbA990D01E20338681f6dE',
            ⌛️blockNumber: 18776,
            ⌛️transactionHash: '0x42b4c699f613045f09a7201fe328a9a91843c0fafdb0bd1f5a22d13b964522bb',
            ⌛️transactionIndex: 0,
            ⌛️blockHash: '0xce26fb2518f4c79228c188132c996dea311c93da73cf934d630dd696e3f70181',
            ⌛️logIndex: 0,
            ⌛️removed: false,
            ⌛️id: 'log_b8492241',
            ⌛️returnValues: Result {
                '0': 'Hello as argument',
                '1': '1672832828',
                payload: 'Hello as argument',
                blocktime: '1672832828'
            },

            ⌛️event: 'Checkpoint',
            ⌛️signature: '0x5d882878f6c50530e63829854e64755332e385dbf9dd9c2798e07d9c88c67e40',
            ⌛️raw: {
                data: '0x00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000063b5673c000000000000000000000000000000000000000000000000000000000000001148656c6c6f20617320617267756d656e74000000000000000000000000000000',
                topics: [Array]
            }
        },

        ...(next logs)

    ]


        _____________________Add manually______________________

        address - '0x'+result.receipt.logs[0][0].toString('hex') (NOTE: The first(0) element in each arrays in <logs> array is the appropriate contract address logs related to)

        Example: 

        logs:[
            [<address0>,<topics0>,<logs0>],
            [<address1>,<topics1>,<logs1>],
            ...
        ]

        blockNumber - block.number
        transactionHash - '0x'+tx.hash().toString('hex')
        transactionIndex - set manually(in hex)
        blockHash - '0x'+block.hash().toString('hex')
        logIndex - take from logs received from tx.receipt
        removed - false(no chain reorganization )
        id - 'log_00000000'
        returnValues - take from web3.eth.abi.decodeLog(JSON.parse(ABI),logsInHex,topicsArrayInHex)
        event - take from query
        signature - event signature hash (topics[0])

        raw: {
        
            data:'0x'+logsInHex,
            topics:topicsArrayInHex
        
        }

    */

    let [queryOptions] = params

    let {filter,fromBlock,toBlock,address,topics} = queryOptions

    let currentBlockIndex


    let fromBlockIsHex = Web3.utils.isHex(fromBlock)

    let toBlockIsHex = Web3.utils.isHex(toBlock)


    
    if((fromBlockIsHex || fromBlock === 'latest') && (toBlockIsHex || toBlock === 'latest')){


        if(fromBlock === 'latest' || toBlock === 'latest'){

            currentBlockIndex = global.KLY_EVM.getCurrentBlock().header.number
    
        }
    
    
        if(fromBlockIsHex) fromBlock = BigInt(fromBlock)
        
        else if(fromBlock === 'latest') fromBlock = currentBlockIndex
        
    
        if(toBlockIsHex) toBlock = BigInt(fromBlock)
    
        else if(toBlock === 'latest') toBlock = currentBlockIndex
        
        //____________________________ Go through the saved logs and get them ____________________________

        let arrayWithLogsToResponse = []

        
        while(fromBlock!==toBlock){

            let blockLogs = await global.STATE.get(`EVM_LOGS:${Web3.utils.toHex(fromBlock.toString())}`).catch(_=>false)

            if(blockLogs){

                /*
                
                blockLogs looks like this:
                
                {
                    contractAddress0:[
                        contractLog0_0,contractLog0_1,contractLog0_2,...,contractLog0_N
                    ],
                    
                    contractAddress1:[
                        contractLog1_0,contractLog1_1,contractLog1_2,...,contractLog1_N
                    ],

                    ...

                    contractAddressM:[
                        contractLogM_0,contractLogM_1,contractLogM_2,...,contractLogM_N
                    ]
                
                }

                */

                // Find our contract

                let contractRelatedArrayOfLogs = blockLogs[address]

                //____________________________ Now, go through the topics and compare with requested ones ____________________________

                if(contractRelatedArrayOfLogs){

                    contractRelatedArrayOfLogs.forEach(
                        
                        singleLog => singleLog.topics.toString() === topics.toString() && arrayWithLogsToResponse.push(singleLog)
                        
                    )

                }


            }

            fromBlock = fromBlock + BigInt(1)

        }

        return arrayWithLogsToResponse


    }else return {error:`Wrong values of <fromBlock> or <toBlock>. Possible values are: <block_index_in_hex> | 'latest'`}
    
})




// Returns the value from a storage position at a given address
METHODS_MAPPING.set('eth_getStorageAt',params=>{

    let [address,quantity,quantityOrTag] = params

    //But for tests now it's 13371337

    return '0x13371337'

})




//___________________________________Don't need in KLY symbiotes___________________________________








METHODS_MAPPING.set('eth_coinbase',_=>global.KLY_EVM_OPTIONS.coinbase)

METHODS_MAPPING.set('eth_mining',_=>false)

METHODS_MAPPING.set('eth_hashrate',_=>0)

METHODS_MAPPING.set('eth_accounts',_=>[])


// Don't need in KLY
// Info: We'll use simple blocks without uncles, so this value will be 0 by default
// However, if you use our KLY-EVM JSON-RPC2.0 implementation you'll need to change behaviour
METHODS_MAPPING.set('eth_getUncleCountByBlockHash',_=>0)

METHODS_MAPPING.set('eth_getUncleCountByBlockNumber',_=>0)

// Returns information about a uncle of a block by hash and uncle index position
METHODS_MAPPING.set('eth_getUncleByBlockHashAndIndex',_=>{})

METHODS_MAPPING.set('eth_getUncleByBlockNumberAndIndex',_=>{})


// MINING STUFF ___________________________

// Don't need in KLY
METHODS_MAPPING.set('eth_getWork',_=>

    [

        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0x0000000000000000000000000000000000000000000000000000000000000000'

    ]
    
)


// Don't need in KLY
METHODS_MAPPING.set('eth_submitWork',_=>

    [

        '0x0000000000000000',
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0x0000000000000000000000000000000000000000000000000000000000000000'

    ]
    
)




// Don't need in KLY
METHODS_MAPPING.set('eth_submitHashrate',_=>

    [
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0x0000000000000000000000000000000000000000000000000000000000000000'
    ]
    
)



// FILTERS ___________________________

//https://ethereum.org/ru/developers/docs/apis/json-rpc/#eth_newfilter
METHODS_MAPPING.set('eth_newFilter',params=>{

    // Coming soon

    return ''
    
})

//https://ethereum.org/ru/developers/docs/apis/json-rpc/#eth_newblockfilter
METHODS_MAPPING.set('eth_newBlockFilter',params=>{

    // Coming soon

    return ''
    
})

//https://ethereum.org/ru/developers/docs/apis/json-rpc/#eth_newblockfilter
METHODS_MAPPING.set('eth_newPendingTransactionFilter',params=>{

    // Coming soon

    return ''
    
})

//https://ethereum.org/ru/developers/docs/apis/json-rpc/#eth_newblockfilter
METHODS_MAPPING.set('eth_uninstallFilter',params=>{

    // Coming soon

    return ''
    
})

//https://ethereum.org/ru/developers/docs/apis/json-rpc/#eth_newblockfilter
METHODS_MAPPING.set('eth_getFilterChanges',params=>{

    // Coming soon

    return ''
    
})

//https://ethereum.org/ru/developers/docs/apis/json-rpc/#eth_newblockfilter
METHODS_MAPPING.set('eth_getFilterLogs',params=>{

    // Coming soon

    return ''
    
})



// COMPILLERS ___________________________


METHODS_MAPPING.set('eth_getCompilers',_=>{

    return ['solidity']
    
})


METHODS_MAPPING.set('eth_compileSolidity',params=>{

    let [codeSource] = params

    //Do compilation via solc

    return ''
    
})


METHODS_MAPPING.set('eth_compileLLL',params=>{

    let [codeSource] = params

    //Do compilation via solc

    return ''
    
})



METHODS_MAPPING.set('eth_compileSerpent',params=>{

    let [codeSource] = params

    //Do compilation via solc

    return ''
    
})