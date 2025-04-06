/*



    
code	message	meaning

-32700	Parse error	Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.
-32600	Invalid Request	The JSON sent is not a valid Request object.
-32601	Method not found	The method does not exist / is not available.
-32602	Invalid params	Invalid method parameter(s).
-32603	Internal error	Internal JSON-RPC error.


-32000 to -32099	Server error	Reserved for implementation-defined server-errors.




*/


//Make it visible from all the modules
global.METHODS_MAPPING=new Map()


let modules = ['web3','net','kly']

for(let mod of modules) await import(`./${mod}.js`)


let ERROR_RETURN=(code,message,id)=>(

    {
        jsonrpc:"2.0",
        error: {code,message},
        id
    }

)

let RETURN_RESULT=(result,id)=>(

    {
        jsonrpc:"2.0",
        result,
        id
    }

)




export let EVM_ROUTE_HANDLER = async(request,response) => {

    response.header('Access-Control-Allow-Origin','*')

    // Body looks like this {"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1}
    // Response looks like {"jsonrpc": "2.0", "result": 19, "id": 1}

    let body = request.body

    let paramsAreOk = body?.params ? Array.isArray(body.params) : true 

    if(!body) response.send(ERROR_RETURN(-32700,"Parse error",body.id))
    
    else if(body.jsonrpc==='2.0' && typeof body.method==='string' && paramsAreOk){

        if(METHODS_MAPPING.has(body.method)){

            let result = await METHODS_MAPPING.get(body.method)(body.params)

            if(result.error) response.send(ERROR_RETURN(-32602,"Invalid params => "+result.error,body.id))

            else response.send(RETURN_RESULT(result,body.id))

        }else response.send(ERROR_RETURN(-32601,"Method not found",body.id))

    }else response.send(ERROR_RETURN(-32600,"Invalid Request",body.id))

}




export let WEBSOCKET_EVM_ROUTE_HANDLER = async body => {

    let paramsAreOk = body?.params ? Array.isArray(body.params) : true 

    if(!body) return ERROR_RETURN(-32700,"Parse error",body.id)
    
    else if(body.jsonrpc==='2.0' && typeof body.method==='string' && paramsAreOk){

        if(METHODS_MAPPING.has(body.method)){

            let result = await METHODS_MAPPING.get(body.method)(body.params)

            if(result.error) return ERROR_RETURN(-32602,"Invalid params => "+result.error,body.id)

            else return RETURN_RESULT(result,body.id)

        }else return ERROR_RETURN(-32601,"Method not found",body.id)

    }else return ERROR_RETURN(-32600,"Invalid Request",body.id)


}