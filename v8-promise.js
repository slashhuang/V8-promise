/*
 * @Author slashhuang
 * 17/3/24
 * A v8 Promise overview
 */

const kPending = 0;
const kFulfilled = +1;
const kRejected = +2;
const kResolveCallback = 0;
const kRejectCallback = 1;
const UNDEFINED = undefined;

let { SET_PRIVATE,_Call,utils } = require('./util');
// promise主逻辑
const GlobalPromise = (executor)=>{
	let promise = PromiseInit(GlobalPromise);
	//create_resolving_functions这个函数的实现在bootstraper.cc第3622行 
	let callbacks =  create_resolving_functions(promise, true);
	try{
    	executor(callbacks[kResolveCallback], callbacks[kRejectCallback]);
	}catch(e){
		 _Call(callbacks[kRejectCallback], UNDEFINED, e);

	};
	return promise
}
function PromiseInit(promise) {
  return PromiseSet(promise, kPending, UNDEFINED);
}
function PromiseSet(promise, status, value) {
  SET_PRIVATE(promise, promiseStateSymbol, status);
  SET_PRIVATE(promise, promiseResultSymbol, value);
  SET_PRIVATE(promise, promiseFulfillReactionsSymbol, UNDEFINED);
  SET_PRIVATE(promise, promiseRejectReactionsSymbol, UNDEFINED);
  SET_PRIVATE(promise, promiseDeferredReactionSymbol, UNDEFINED);
  return promise;
}

function PromiseCreateAndSet(status, value) {
  var promise = new GlobalPromise(promiseRawSymbol);
  return PromiseSet(promise, status, value);
}

function PromiseHandle(value, handler, deferred) {
  try {
    var result = handler(value);
    if (IS_UNDEFINED(deferred.resolve)) {
      ResolvePromise(deferred.promise, result);
    } else {
      _Call(deferred.resolve, UNDEFINED, result);
    }
  } catch (exception) {  // Natives syntax to mark this catch block.
    try {
      if (IS_UNDEFINED(deferred.reject)) {
        // Pass false for debugEvent so .then chaining does not trigger
        // redundant ExceptionEvents.
        PromiseReject(deferred.promise, exception, false);
        PromiseSet(deferred.promise, kRejected, exception);
      } else {
        _Call(deferred.reject, UNDEFINED, exception);
      }
    } catch (e) { }
  }
}

function PromiseAttachCallbacks(promise, deferred, onResolve, onReject) {
  var maybeResolveCallbacks =
      GET_PRIVATE(promise, promiseFulfillReactionsSymbol);
  if (IS_UNDEFINED(maybeResolveCallbacks)) {
	  SET_PRIVATE(promise, promiseFulfillReactionsSymbol, onResolve);
	  SET_PRIVATE(promise, promiseRejectReactionsSymbol, onReject);
	  SET_PRIVATE(promise, promiseDeferredReactionSymbol, deferred);
  } else if (!IS_ARRAY(maybeResolveCallbacks)) {
    var resolveCallbacks = new InternalArray();
    var rejectCallbacks = new InternalArray();
    var existingDeferred = GET_PRIVATE(promise, promiseDeferredReactionSymbol);

    resolveCallbacks.push(
        maybeResolveCallbacks, existingDeferred, onResolve, deferred);
    rejectCallbacks.push(GET_PRIVATE(promise, promiseRejectReactionsSymbol),
                         existingDeferred,
                         onReject,
                         deferred);

    SET_PRIVATE(promise, promiseFulfillReactionsSymbol, resolveCallbacks);
    SET_PRIVATE(promise, promiseRejectReactionsSymbol, rejectCallbacks);
    SET_PRIVATE(promise, promiseDeferredReactionSymbol, UNDEFINED);
  } else {
    maybeResolveCallbacks.push(onResolve, deferred);
    GET_PRIVATE(promise, promiseRejectReactionsSymbol).push(onReject, deferred);
  }
}


function PromiseIdResolveHandler(x) { return x; }
function PromiseIdRejectHandler(r) { %_ReThrow(r); }
SET_PRIVATE(PromiseIdRejectHandler, promiseForwardingHandlerSymbol, true);
// For bootstrapper.

function IsPromise(x) {
  return IS_RECEIVER(x) && HAS_DEFINED_PRIVATE(x, promiseStateSymbol);
}

function PromiseCreate() {
  return PromiseInit(new GlobalPromise(promiseRawSymbol));
}
// ES#sec-promise-resolve-functions
// Promise Resolve Functions, steps 6-13
function ResolvePromise(promise, resolution) {
  if (resolution === promise) {
    var exception = %make_type_error(kPromiseCyclic, resolution);
    %PromiseReject(promise, exception, true);
    PromiseSet(promise, kRejected, exception);
    return;
  }
  if (IS_RECEIVER(resolution)) {
    try {
      var then = resolution.then;
    } catch (e) {
      %PromiseReject(promise, e, true);
      PromiseSet(promise, kRejected, e);
      return;
    }

    // Resolution is a native promise and if it's already resolved or
    // rejected, shortcircuit the resolution procedure by directly
    // reusing the value from the promise.
    if (IsPromise(resolution) && then === PromiseThen) {
      var thenableState = GET_PRIVATE(resolution, promiseStateSymbol);
      if (thenableState === kFulfilled) {
        // This goes inside the if-else to save one symbol lookup in
        // the slow path.
        var thenableValue = GET_PRIVATE(resolution, promiseResultSymbol);
        %PromiseFulfill(promise, kFulfilled, thenableValue,
                       promiseFulfillReactionsSymbol);
        PromiseSet(promise, kFulfilled, thenableValue);
        SET_PRIVATE(promise, promiseHasHandlerSymbol, true);
        return;
      } else if (thenableState === kRejected) {
        var thenableValue = GET_PRIVATE(resolution, promiseResultSymbol);
        if (!HAS_DEFINED_PRIVATE(resolution, promiseHasHandlerSymbol)) {
          // Promise has already been rejected, but had no handler.
          // Revoke previously triggered reject event.
          %PromiseRevokeReject(resolution);
        }
        // Don't cause a debug event as this case is forwarding a rejection
        %PromiseReject(promise, thenableValue, false);
        PromiseSet(promise, kRejected, thenableValue);
        SET_PRIVATE(resolution, promiseHasHandlerSymbol, true);
        return;
      }
    }

    if (IS_CALLABLE(then)) {
      %EnqueuePromiseResolveThenableJob(promise, resolution, then);
      return;
    }
  }
  %PromiseFulfill(promise, kFulfilled, resolution,
                  promiseFulfillReactionsSymbol);
  PromiseSet(promise, kFulfilled, resolution);
}

// Only used by async-await.js
function RejectPromise(promise, reason, debugEvent) {
  %PromiseReject(promise, reason, debugEvent);
  PromiseSet(promise, kRejected, reason);
}

// Export to bindings
function DoRejectPromise(promise, reason) {
  %PromiseReject(promise, reason, true);
  PromiseSet(promise, kRejected, reason);
}

// ES#sec-newpromisecapability
// NewPromiseCapability ( C )
function NewPromiseCapability(C, debugEvent) {
  if (C === GlobalPromise) {
    // Optimized case, avoid extra closure.
    var promise = PromiseCreate();
    // TODO(gsathya): Remove container for callbacks when this is
    // moved to CPP/TF.
    var callbacks = %create_resolving_functions(promise, debugEvent);
    return {
      promise: promise,
      resolve: callbacks[kResolveCallback],
      reject: callbacks[kRejectCallback]
    };
  }

  var result = {promise: UNDEFINED, resolve: UNDEFINED, reject: UNDEFINED };
  result.promise = new C((resolve, reject) => {
    if (!IS_UNDEFINED(result.resolve) || !IS_UNDEFINED(result.reject))
        throw %make_type_error(kPromiseExecutorAlreadyInvoked);
    result.resolve = resolve;
    result.reject = reject;
  });

  if (!IS_CALLABLE(result.resolve) || !IS_CALLABLE(result.reject))
      throw %make_type_error(kPromiseNonCallable);

  return result;
}

// ES#sec-promise.reject
// Promise.reject ( x )
function PromiseReject(r) {
  if (!IS_RECEIVER(this)) {
    throw %make_type_error(kCalledOnNonObject, PromiseResolve);
  }
  if (this === GlobalPromise) {
    // Optimized case, avoid extra closure.
    var promise = PromiseCreateAndSet(kRejected, r);
    // Trigger debug events if the debugger is on, as Promise.reject is
    // equivalent to throwing an exception directly.
    %PromiseRejectEventFromStack(promise, r);
    return promise;
  } else {
    var promiseCapability = NewPromiseCapability(this, true);
    %_Call(promiseCapability.reject, UNDEFINED, r);
    return promiseCapability.promise;
  }
}

function PerformPromiseThen(promise, onResolve, onReject, resultCapability) {
  if (!IS_CALLABLE(onResolve)) onResolve = PromiseIdResolveHandler;
  if (!IS_CALLABLE(onReject)) onReject = PromiseIdRejectHandler;

  var status = GET_PRIVATE(promise, promiseStateSymbol);
  switch (status) {
    case kPending:
      PromiseAttachCallbacks(promise, resultCapability, onResolve, onReject);
      break;
    case kFulfilled:
      %EnqueuePromiseReactionJob(GET_PRIVATE(promise, promiseResultSymbol),
                                 onResolve, resultCapability, kFulfilled);
      break;
    case kRejected:
      if (!HAS_DEFINED_PRIVATE(promise, promiseHasHandlerSymbol)) {
        // Promise has already been rejected, but had no handler.
        // Revoke previously triggered reject event.
        %PromiseRevokeReject(promise);
      }
      %EnqueuePromiseReactionJob(GET_PRIVATE(promise, promiseResultSymbol),
                                 onReject, resultCapability, kRejected);
      break;
  }

  // Mark this promise as having handler.
  SET_PRIVATE(promise, promiseHasHandlerSymbol, true);
  return resultCapability.promise;
}

// ES#sec-promise.prototype.then
// Promise.prototype.then ( onFulfilled, onRejected )
// Multi-unwrapped chaining with thenable coercion.
function PromiseThen(onResolve, onReject) {
  var status = GET_PRIVATE(this, promiseStateSymbol);
  if (IS_UNDEFINED(status)) {
    throw %make_type_error(kNotAPromise, this);
  }

  var constructor = SpeciesConstructor(this, GlobalPromise);
  var resultCapability;

  // The resultCapability.promise is only ever fulfilled internally,
  // so we don't need the closures to protect against accidentally
  // calling them multiple times.
  if (constructor === GlobalPromise) {
    // TODO(gsathya): Combine this into NewPromiseCapability.
    resultCapability = {
      promise: PromiseCreate(),
      resolve: UNDEFINED,
      reject: UNDEFINED
    };
  } else {
    // Pass false for debugEvent so .then chaining does not trigger
    // redundant ExceptionEvents.
    resultCapability = NewPromiseCapability(constructor, false);
  }
  return PerformPromiseThen(this, onResolve, onReject, resultCapability);
}

// ES#sec-promise.prototype.catch
// Promise.prototype.catch ( onRejected )
function PromiseCatch(onReject) {
  return this.then(UNDEFINED, onReject);
}

// Combinators.

// ES#sec-promise.resolve
// Promise.resolve ( x )
function PromiseResolve(x) {
  if (!IS_RECEIVER(this)) {
    throw %make_type_error(kCalledOnNonObject, PromiseResolve);
  }
  if (IsPromise(x) && x.constructor === this) return x;

  // Avoid creating resolving functions.
  if (this === GlobalPromise) {
    var promise = PromiseCreate();
    ResolvePromise(promise, x);
    return promise;
  }

  // debugEvent is not so meaningful here as it will be resolved
  var promiseCapability = NewPromiseCapability(this, true);
  %_Call(promiseCapability.resolve, UNDEFINED, x);
  return promiseCapability.promise;
}

// ES#sec-promise.all
// Promise.all ( iterable )
function PromiseAll(iterable) {
  if (!IS_RECEIVER(this)) {
    throw %make_type_error(kCalledOnNonObject, "Promise.all");
  }

  // false debugEvent so that forwarding the rejection through all does not
  // trigger redundant ExceptionEvents
  var deferred = NewPromiseCapability(this, false);
  var resolutions = new InternalArray();
  var count;

  // For catch prediction, don't treat the .then calls as handling it;
  // instead, recurse outwards.
  var instrumenting = DEBUG_IS_ACTIVE;
  if (instrumenting) {
    SET_PRIVATE(deferred.reject, promiseForwardingHandlerSymbol, true);
  }

  function CreateResolveElementFunction(index, values, promiseCapability) {
    var alreadyCalled = false;
    return (x) => {
      if (alreadyCalled === true) return;
      alreadyCalled = true;
      values[index] = x;
      if (--count === 0) {
        var valuesArray = [];
        %MoveArrayContents(values, valuesArray);
        %_Call(promiseCapability.resolve, UNDEFINED, valuesArray);
      }
    };
  }

  try {
    var i = 0;
    count = 1;
    for (var value of iterable) {
      var nextPromise = this.resolve(value);
      ++count;
      var throwawayPromise = nextPromise.then(
          CreateResolveElementFunction(i, resolutions, deferred),
          deferred.reject);
      // For catch prediction, mark that rejections here are semantically
      // handled by the combined Promise.
      if (instrumenting && IsPromise(throwawayPromise)) {
        SET_PRIVATE(throwawayPromise, promiseHandledBySymbol, deferred.promise);
      }
      ++i;
    }

    // 6.d
    if (--count === 0) {
      var valuesArray = [];
      %MoveArrayContents(resolutions, valuesArray);
      %_Call(deferred.resolve, UNDEFINED, valuesArray);
    }

  } catch (e) {
    %_Call(deferred.reject, UNDEFINED, e);
  }
  return deferred.promise;
}

// ES#sec-promise.race
// Promise.race ( iterable )
function PromiseRace(iterable) {
  if (!IS_RECEIVER(this)) {
    throw %make_type_error(kCalledOnNonObject, PromiseRace);
  }

  // false debugEvent so that forwarding the rejection through race does not
  // trigger redundant ExceptionEvents
  var deferred = NewPromiseCapability(this, false);

  // For catch prediction, don't treat the .then calls as handling it;
  // instead, recurse outwards.
  var instrumenting = DEBUG_IS_ACTIVE;
  if (instrumenting) {
    SET_PRIVATE(deferred.reject, promiseForwardingHandlerSymbol, true);
  }

  try {
    for (var value of iterable) {
      var throwawayPromise = this.resolve(value).then(deferred.resolve,
                                                      deferred.reject);
      // For catch prediction, mark that rejections here are semantically
      // handled by the combined Promise.
      if (instrumenting && IsPromise(throwawayPromise)) {
        SET_PRIVATE(throwawayPromise, promiseHandledBySymbol, deferred.promise);
      }
    }
  } catch (e) {
    %_Call(deferred.reject, UNDEFINED, e);
  }
  return deferred.promise;
}


// Utility for debugger

function PromiseHasUserDefinedRejectHandlerCheck(handler, deferred) {
  // Recurse to the forwarding Promise, if any. This may be due to
  //  - await reaction forwarding to the throwaway Promise, which has
  //    a dependency edge to the outer Promise.
  //  - PromiseIdResolveHandler forwarding to the output of .then
  //  - Promise.all/Promise.race forwarding to a throwaway Promise, which
  //    has a dependency edge to the generated outer Promise.
  if (GET_PRIVATE(handler, promiseForwardingHandlerSymbol)) {
    return PromiseHasUserDefinedRejectHandlerRecursive(deferred.promise);
  }

  // Otherwise, this is a real reject handler for the Promise
  return true;
}

function PromiseHasUserDefinedRejectHandlerRecursive(promise) {
  // If this promise was marked as being handled by a catch block
  // in an async function, then it has a user-defined reject handler.
  if (GET_PRIVATE(promise, promiseHandledHintSymbol)) return true;

  // If this Promise is subsumed by another Promise (a Promise resolved
  // with another Promise, or an intermediate, hidden, throwaway Promise
  // within async/await), then recurse on the outer Promise.
  // In this case, the dependency is one possible way that the Promise
  // could be resolved, so it does not subsume the other following cases.
  var outerPromise = GET_PRIVATE(promise, promiseHandledBySymbol);
  if (outerPromise &&
      PromiseHasUserDefinedRejectHandlerRecursive(outerPromise)) {
    return true;
  }

  var queue = GET_PRIVATE(promise, promiseRejectReactionsSymbol);
  var deferred = GET_PRIVATE(promise, promiseDeferredReactionSymbol);

  if (IS_UNDEFINED(queue)) return false;

  if (!IS_ARRAY(queue)) {
    return PromiseHasUserDefinedRejectHandlerCheck(queue, deferred);
  }

  for (var i = 0; i < queue.length; i += 2) {
    if (PromiseHasUserDefinedRejectHandlerCheck(queue[i], queue[i + 1])) {
      return true;
    }
  }
  return false;
}

// Return whether the promise will be handled by a user-defined reject
// handler somewhere down the promise chain. For this, we do a depth-first
// search for a reject handler that's not the default PromiseIdRejectHandler.
// This function also traverses dependencies of one Promise on another,
// set up through async/await and Promises resolved with Promises.
function PromiseHasUserDefinedRejectHandler() {
  return PromiseHasUserDefinedRejectHandlerRecursive(this);
};

function MarkPromiseAsHandled(promise) {
  SET_PRIVATE(promise, promiseHasHandlerSymbol, true);
}


function PromiseSpecies() {
  return this;
}

// -------------------------------------------------------------------
// Install exported functions.

utils.InstallFunctions(GlobalPromise, {
  "reject": PromiseReject,
  "all": PromiseAll,
  "race":PromiseRace,
  "resolve": PromiseResolve
});

utils.InstallFunctions(GlobalPromise.prototype, {
  "then": PromiseThen,
  "catch": PromiseCatch
});















