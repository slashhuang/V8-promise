/**
 * inspired by https://github.com/zenparsing/v8-promise
 * @Author slashhuang
 * 17/3/24
 * MutationObserver reference https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
 */

let {
	SET_PRIVATE,
	_Call,
	utils,
	IS_CALLABLE,
	IS_UNDEFINED,
	make_type_error,
	GET_PRIVATE,
	IS_SPEC_FUNCTION,
	IS_SPEC_OBJECT,
	HAS_DEFINED_PRIVATE,
	AddNamedProperty,
	InstallFunctions,
	Global
} = require('./util');
/*
 * Create an efficient microtask queueing mechanism
 * -------- 异步队列管理 -------
 */ 
let runLater = (function() {
    // Newish Browsers
    var Observer = Global.MutationObserver || Global.WebKitMutationObserver;
    if (Observer){
    	//利用mutationObserver管理异步处理
        let queuedFn = void 0;
        let observer = new Observer(()=>{
            var fn = queuedFn;
            queuedFn = void 0;
            fn();
        });
        observer.observe(document.createElement("div"), { attributes: true });
        return fn=> {
            if (queuedFn !== void 0)
                throw new Error("Only one function can be queued at a time");
            queuedFn = fn;
            div.classList.toggle("x");
        };
    }
	// Fallback
    return fn => setTimeout(fn, 0)
})();

let EnqueueMicrotask = (function() {
    let queue = null;
    let flush = ()=>{
        let q = queue;
        queue = null;
        q.forEach(fn=>fn())
    }
    return function PromiseEnqueueMicrotask(fn) {
        // fn must not throw
        if (!queue) {
            queue = [];
            runLater(flush);
        }
        queue.push(fn);
    };
})();
/*
 * -------- 异步队列管理结束 -------
 */ 


var UNDEFINED, DONT_ENUM, InternalArray = Array;
// V8 Implementation
// Status values: 0 = pending, +1 = resolved, -1 = rejected
var promiseStatus = "Promise#status";
var promiseValue = "Promise#value";
var promiseOnResolve = "Promise#onResolve";
var promiseOnReject = "Promise#onReject";
var promiseRaw = {};
var promiseHasHandler = "Promise#hasHandler";
var lastMicrotaskId = 0;

var $Promise = function Promise(resolver) {
    if (resolver === promiseRaw) return;
    if (!IS_SPEC_FUNCTION(resolver))
      throw MakeTypeError('resolver_not_a_function', [resolver]);
    var promise = PromiseInit(this);
    try {
        resolver(x=>PromiseResolve(promise, x),r=>PromiseReject(promise, r));
    } catch (e) {
        PromiseReject(promise, e);
    }
}
//初始化Promise状态
function PromiseInit(promise) {
    return PromiseSet(promise, 0, UNDEFINED, new InternalArray, new InternalArray);
}
//data-model for promsie
function PromiseSet(promise, status, value, onResolve, onReject) {
    SET_PRIVATE(promise, promiseStatus, status);
    SET_PRIVATE(promise, promiseValue, value);
    SET_PRIVATE(promise, promiseOnResolve, onResolve);
    SET_PRIVATE(promise, promiseOnReject, onReject);
    return promise;
}
//添加处理队列
let PromiseDone = (promise, status, value, promiseQueue)=> {
    if (GET_PRIVATE(promise, promiseStatus) === 0) {
        PromiseEnqueue(value, GET_PRIVATE(promise, promiseQueue), status);
        PromiseSet(promise, status, value);
    }
}
let PromiseResolve = (promise, x) =>{
    PromiseDone(promise, +1, x, promiseOnResolve);
};
let PromiseReject = (promise, r)=>{
    PromiseDone(promise, -1, r, promiseOnReject);
};
let PromiseEnqueue = (value, tasks, status)=>{
    EnqueueMicrotask(function() {
        for (var i = 0; i < tasks.length; i += 2)
            PromiseHandle(value, tasks[i], tasks[i + 1]);
    });
}

let PromiseHandle = (value, handler, deferred)=>{
    try {
        var result = handler(value);
        if (result === deferred.promise)
            throw MakeTypeError('promise_cyclic', [result]);
        else if (IsPromise(result))
            PromiseChain.call(result, deferred.resolve, deferred.reject);
        else
            deferred.resolve(result);
    } catch (exception) {
        try { deferred.reject(exception) } catch (e) { }
    }
}

function PromiseCoerce(constructor, x) {
    if (!IsPromise(x) && IS_SPEC_OBJECT(x)) {
        var then;
        try {
            then = x.then;
        } catch(r) {
            return PromiseRejected.call(constructor, r);
        }
        if (IS_SPEC_FUNCTION(then)) {
            var deferred = PromiseDeferred.call(constructor);
            try {
                then.call(x, deferred.resolve, deferred.reject);
            } catch(r) {
                deferred.reject(r);
            }
            return deferred.promise;
        }
    }
    return x;
}

function PromiseIdResolveHandler(x) { return x }
function PromiseIdRejectHandler(r) { throw r }
function PromiseNopResolver() {}
// -------------------------------------------------------------------
// Define exported functions.
// For bootstrapper.
let IsPromise = function IsPromise(x) {
    return IS_SPEC_OBJECT(x) && HAS_DEFINED_PRIVATE(x, promiseStatus);
};
let PromiseCreate = function PromiseCreate() {
    return new $Promise(PromiseNopResolver);
};
// Convenience.
function PromiseDeferred() {
    if (this === $Promise) {
        // Optimized case, avoid extra closure.
        var promise = PromiseInit(new $Promise(promiseRaw));
        return {
            promise: promise,
            resolve: function(x) { PromiseResolve(promise, x) },
            reject: function(r) { PromiseReject(promise, r) }
        };
    } else {
        var result = {};
        result.promise = new this(function(resolve, reject) {
            result.resolve = resolve;
            result.reject = reject;
        });
        return result;
    }
}
function PromiseResolved(x) {
    if (this === $Promise) {
        // Optimized case, avoid extra closure.
        return PromiseSet(new $Promise(promiseRaw), +1, x);
    } else {
        return new this(function(resolve, reject) { resolve(x) });
    }
}
function PromiseRejected(r) {
    var promise;
    if (this === $Promise) {
        // Optimized case, avoid extra closure.
        promise = PromiseSet(new $Promise(promiseRaw), -1, r);
    } else {
        promise = new this(function(resolve, reject) { reject(r) });
    }
    return promise;
}
// Simple chaining.
let PromiseChain = function PromiseChain(onResolve, onReject) {
    onResolve = IS_UNDEFINED(onResolve) ? PromiseIdResolveHandler : onResolve;
    onReject = IS_UNDEFINED(onReject) ? PromiseIdRejectHandler : onReject;
    var deferred = PromiseDeferred.call(this.constructor);
    switch (GET_PRIVATE(this, promiseStatus)) {
        case UNDEFINED:
            throw MakeTypeError('not_a_promise', [this]);
        case 0:  // Pending
            GET_PRIVATE(this, promiseOnResolve).push(onResolve, deferred);
            GET_PRIVATE(this, promiseOnReject).push(onReject, deferred);
            break;
        case +1:  // Resolved
            PromiseEnqueue(GET_PRIVATE(this, promiseValue), [onResolve, deferred], +1);
            break;
        case -1:  // Rejected
            PromiseEnqueue(GET_PRIVATE(this, promiseValue), [onReject, deferred], -1);
            break;
    }
    // Mark this promise as having handler.
    SET_PRIVATE(this, promiseHasHandler, true);
    return deferred.promise;
}

let PromiseCatch = function PromiseCatch(onReject) {
    return this.then(UNDEFINED, onReject);
}

// Multi-unwrapped chaining with thenable coercion.
let PromiseThen = function PromiseThen(onResolve, onReject) {
    onResolve = IS_SPEC_FUNCTION(onResolve) ? onResolve : PromiseIdResolveHandler;
    onReject = IS_SPEC_FUNCTION(onReject) ? onReject : PromiseIdRejectHandler;
    var that = this;
    var constructor = this.constructor;
    return PromiseChain.call(
        this,
        function(x) {
            x = PromiseCoerce(constructor, x);
            return x === that ? onReject(MakeTypeError('promise_cyclic', [x])) :
                IsPromise(x) ? x.then(onResolve, onReject) :
                onResolve(x);
        },
        onReject);
}
// Combinators.
let PromiseCast = function PromiseCast(x) {
    return IsPromise(x) ? x : new this(function(resolve) { resolve(x) });
}
let PromiseAll = function PromiseAll(values) {
    var deferred = PromiseDeferred.call(this);
    var resolutions = [];
    if (!IsArray(values)) {
        deferred.reject(MakeTypeError('invalid_argument'));
        return deferred.promise;
    }
    try {
        var count = values.length;
        if (count === 0) {
            deferred.resolve(resolutions);
        } else {
            for (var i = 0; i < values.length; ++i) {
                this.resolve(values[i]).then(
                    (function() {
                        // Nested scope to get closure over current i (and avoid .bind).
                        var i_captured = i;
                        return function(x) {
                            resolutions[i_captured] = x;
                            if (--count === 0) deferred.resolve(resolutions);
                        };
                    })(),
                    function(r) { deferred.reject(r) });
            }
        }
    } catch (e) {
        deferred.reject(e);
    }
    return deferred.promise;
}
let PromiseOne = function PromiseOne(values) {
    var deferred = PromiseDeferred.call(this);
    if (!IsArray(values)) {
        deferred.reject(MakeTypeError('invalid_argument'));
        return deferred.promise;
    }
    try {
        for (var i = 0; i < values.length; ++i) {
            this.resolve(values[i]).then(
                function(x) { deferred.resolve(x) },
                function(r) { deferred.reject(r) });
        }
    } catch (e) {
        deferred.reject(e);
    }
    return deferred.promise;
}
// -------------------------------------------------------------------
// Install exported functions.
AddNamedProperty(Global, 'Promise', $Promise, DONT_ENUM);
InstallFunctions($Promise, DONT_ENUM, [
    "defer", PromiseDeferred,
    "accept", PromiseResolved,
    "reject", PromiseRejected,
    "all", PromiseAll,
    "race", PromiseOne,
    "resolve", PromiseCast
]);
InstallFunctions($Promise.prototype, DONT_ENUM, [
    "chain", PromiseChain,
    "then", PromiseThen,
    "catch", PromiseCatch
]);

var test = new $Promise((res,rej)=>{
	setTimeout(res,3000,1)
}).then(val=>$Promise.resolve(1)).then(val=>{
	console.log(val);
	return new $Promise((res,rej)=>{
		setTimeout(res,1000,3)
	})
}).then(val=>console.log)



