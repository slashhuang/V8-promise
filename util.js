/*
 * built by slashhuang
 * Promise utils
 * 17/3/25
 */

/*
 * reference
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
 */
 const defineProperty = (obj,prop,value)=>{
 	Object.defineProperty(obj, prop, {
 		//true if and only if the type of this property descriptor may be changed and if the property may be deleted from the corresponding object.
 		configurable:true,
 		//true if and only if this property shows up during enumeration of the properties on the corresponding object.
 		enumerable:false,
 		//The value associated with the property. Can be any valid JavaScript value (number, object, function, etc).
 		value:value,
 		//true if and only if the value associated with the property may be changed with an assignment operator.
 		writable:false

 	})
 }
 const RunLater = process.nextTick;

 module.exports = {
 	defineProperty,
 	RunLater
 }