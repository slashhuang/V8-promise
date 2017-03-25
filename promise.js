/*
 * self fulfilled promise implementation
 * @Author slashhuang
 * 17/3/25
 */



class Promise{
	constructor(executor){
		if(typeof executor!=='function'){
			throw new TypeError(`${executor} is not a function`)
		};
		executor(resolveFn,rejecFn)
	}
	then(){

	}
	catch(){

	}
	static resolve(){

	}
	static reject(){
		
	}
	static all(){

	}
	static race(){
		
	}
}
module.exports = Promise





