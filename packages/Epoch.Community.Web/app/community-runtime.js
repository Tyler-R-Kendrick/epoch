/* Generated from packages/Epoch.Community.Runtime/src/index.ts. Run npm run community-web:app:build. */
"use strict";
var CW_RUNTIME = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // node_modules/react/cjs/react.development.js
  var require_react_development = __commonJS({
    "node_modules/react/cjs/react.development.js"(exports, module) {
      "use strict";
      (function() {
        function defineDeprecationWarning(methodName, info) {
          Object.defineProperty(Component.prototype, methodName, {
            get: function() {
              console.warn(
                "%s(...) is deprecated in plain JavaScript React classes. %s",
                info[0],
                info[1]
              );
            }
          });
        }
        function getIteratorFn(maybeIterable) {
          if (null === maybeIterable || "object" !== typeof maybeIterable)
            return null;
          maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
          return "function" === typeof maybeIterable ? maybeIterable : null;
        }
        function warnNoop(publicInstance, callerName) {
          publicInstance = (publicInstance = publicInstance.constructor) && (publicInstance.displayName || publicInstance.name) || "ReactClass";
          var warningKey = publicInstance + "." + callerName;
          didWarnStateUpdateForUnmountedComponent[warningKey] || (console.error(
            "Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.",
            callerName,
            publicInstance
          ), didWarnStateUpdateForUnmountedComponent[warningKey] = true);
        }
        function Component(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        function ComponentDummy() {
        }
        function PureComponent(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        function noop() {
        }
        function testStringCoercion(value) {
          return "" + value;
        }
        function checkKeyStringCoercion(value) {
          try {
            testStringCoercion(value);
            var JSCompiler_inline_result = false;
          } catch (e) {
            JSCompiler_inline_result = true;
          }
          if (JSCompiler_inline_result) {
            JSCompiler_inline_result = console;
            var JSCompiler_temp_const = JSCompiler_inline_result.error;
            var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            JSCompiler_temp_const.call(
              JSCompiler_inline_result,
              "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
              JSCompiler_inline_result$jscomp$0
            );
            return testStringCoercion(value);
          }
        }
        function getComponentNameFromType(type) {
          if (null == type) return null;
          if ("function" === typeof type)
            return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
          if ("string" === typeof type) return type;
          switch (type) {
            case REACT_FRAGMENT_TYPE:
              return "Fragment";
            case REACT_PROFILER_TYPE:
              return "Profiler";
            case REACT_STRICT_MODE_TYPE:
              return "StrictMode";
            case REACT_SUSPENSE_TYPE:
              return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
              return "SuspenseList";
            case REACT_ACTIVITY_TYPE:
              return "Activity";
          }
          if ("object" === typeof type)
            switch ("number" === typeof type.tag && console.error(
              "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
            ), type.$$typeof) {
              case REACT_PORTAL_TYPE:
                return "Portal";
              case REACT_CONTEXT_TYPE:
                return type.displayName || "Context";
              case REACT_CONSUMER_TYPE:
                return (type._context.displayName || "Context") + ".Consumer";
              case REACT_FORWARD_REF_TYPE:
                var innerType = type.render;
                type = type.displayName;
                type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
                return type;
              case REACT_MEMO_TYPE:
                return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
              case REACT_LAZY_TYPE:
                innerType = type._payload;
                type = type._init;
                try {
                  return getComponentNameFromType(type(innerType));
                } catch (x) {
                }
            }
          return null;
        }
        function getTaskName(type) {
          if (type === REACT_FRAGMENT_TYPE) return "<>";
          if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
            return "<...>";
          try {
            var name = getComponentNameFromType(type);
            return name ? "<" + name + ">" : "<...>";
          } catch (x) {
            return "<...>";
          }
        }
        function getOwner() {
          var dispatcher = ReactSharedInternals.A;
          return null === dispatcher ? null : dispatcher.getOwner();
        }
        function UnknownOwner() {
          return Error("react-stack-top-frame");
        }
        function hasValidKey(config) {
          if (hasOwnProperty.call(config, "key")) {
            var getter = Object.getOwnPropertyDescriptor(config, "key").get;
            if (getter && getter.isReactWarning) return false;
          }
          return void 0 !== config.key;
        }
        function defineKeyPropWarningGetter(props, displayName) {
          function warnAboutAccessingKey() {
            specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
              "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
              displayName
            ));
          }
          warnAboutAccessingKey.isReactWarning = true;
          Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: true
          });
        }
        function elementRefGetterWithDeprecationWarning() {
          var componentName = getComponentNameFromType(this.type);
          didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
            "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
          ));
          componentName = this.props.ref;
          return void 0 !== componentName ? componentName : null;
        }
        function ReactElement(type, key, props, owner, debugStack, debugTask) {
          var refProp = props.ref;
          type = {
            $$typeof: REACT_ELEMENT_TYPE,
            type,
            key,
            props,
            _owner: owner
          };
          null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
            enumerable: false,
            get: elementRefGetterWithDeprecationWarning
          }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
          type._store = {};
          Object.defineProperty(type._store, "validated", {
            configurable: false,
            enumerable: false,
            writable: true,
            value: 0
          });
          Object.defineProperty(type, "_debugInfo", {
            configurable: false,
            enumerable: false,
            writable: true,
            value: null
          });
          Object.defineProperty(type, "_debugStack", {
            configurable: false,
            enumerable: false,
            writable: true,
            value: debugStack
          });
          Object.defineProperty(type, "_debugTask", {
            configurable: false,
            enumerable: false,
            writable: true,
            value: debugTask
          });
          Object.freeze && (Object.freeze(type.props), Object.freeze(type));
          return type;
        }
        function cloneAndReplaceKey(oldElement, newKey) {
          newKey = ReactElement(
            oldElement.type,
            newKey,
            oldElement.props,
            oldElement._owner,
            oldElement._debugStack,
            oldElement._debugTask
          );
          oldElement._store && (newKey._store.validated = oldElement._store.validated);
          return newKey;
        }
        function validateChildKeys(node) {
          isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
        }
        function isValidElement(object) {
          return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
        }
        function escape(key) {
          var escaperLookup = { "=": "=0", ":": "=2" };
          return "$" + key.replace(/[=:]/g, function(match) {
            return escaperLookup[match];
          });
        }
        function getElementKey(element, index) {
          return "object" === typeof element && null !== element && null != element.key ? (checkKeyStringCoercion(element.key), escape("" + element.key)) : index.toString(36);
        }
        function resolveThenable(thenable) {
          switch (thenable.status) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              throw thenable.reason;
            default:
              switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(
                function(fulfilledValue) {
                  "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
                },
                function(error) {
                  "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
                }
              )), thenable.status) {
                case "fulfilled":
                  return thenable.value;
                case "rejected":
                  throw thenable.reason;
              }
          }
          throw thenable;
        }
        function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
          var type = typeof children;
          if ("undefined" === type || "boolean" === type) children = null;
          var invokeCallback = false;
          if (null === children) invokeCallback = true;
          else
            switch (type) {
              case "bigint":
              case "string":
              case "number":
                invokeCallback = true;
                break;
              case "object":
                switch (children.$$typeof) {
                  case REACT_ELEMENT_TYPE:
                  case REACT_PORTAL_TYPE:
                    invokeCallback = true;
                    break;
                  case REACT_LAZY_TYPE:
                    return invokeCallback = children._init, mapIntoArray(
                      invokeCallback(children._payload),
                      array,
                      escapedPrefix,
                      nameSoFar,
                      callback
                    );
                }
            }
          if (invokeCallback) {
            invokeCallback = children;
            callback = callback(invokeCallback);
            var childKey = "" === nameSoFar ? "." + getElementKey(invokeCallback, 0) : nameSoFar;
            isArrayImpl(callback) ? (escapedPrefix = "", null != childKey && (escapedPrefix = childKey.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
              return c;
            })) : null != callback && (isValidElement(callback) && (null != callback.key && (invokeCallback && invokeCallback.key === callback.key || checkKeyStringCoercion(callback.key)), escapedPrefix = cloneAndReplaceKey(
              callback,
              escapedPrefix + (null == callback.key || invokeCallback && invokeCallback.key === callback.key ? "" : ("" + callback.key).replace(
                userProvidedKeyEscapeRegex,
                "$&/"
              ) + "/") + childKey
            ), "" !== nameSoFar && null != invokeCallback && isValidElement(invokeCallback) && null == invokeCallback.key && invokeCallback._store && !invokeCallback._store.validated && (escapedPrefix._store.validated = 2), callback = escapedPrefix), array.push(callback));
            return 1;
          }
          invokeCallback = 0;
          childKey = "" === nameSoFar ? "." : nameSoFar + ":";
          if (isArrayImpl(children))
            for (var i = 0; i < children.length; i++)
              nameSoFar = children[i], type = childKey + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
                nameSoFar,
                array,
                escapedPrefix,
                type,
                callback
              );
          else if (i = getIteratorFn(children), "function" === typeof i)
            for (i === children.entries && (didWarnAboutMaps || console.warn(
              "Using Maps as children is not supported. Use an array of keyed ReactElements instead."
            ), didWarnAboutMaps = true), children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
              nameSoFar = nameSoFar.value, type = childKey + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
                nameSoFar,
                array,
                escapedPrefix,
                type,
                callback
              );
          else if ("object" === type) {
            if ("function" === typeof children.then)
              return mapIntoArray(
                resolveThenable(children),
                array,
                escapedPrefix,
                nameSoFar,
                callback
              );
            array = String(children);
            throw Error(
              "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
            );
          }
          return invokeCallback;
        }
        function mapChildren(children, func, context) {
          if (null == children) return children;
          var result = [], count = 0;
          mapIntoArray(children, result, "", "", function(child) {
            return func.call(context, child, count++);
          });
          return result;
        }
        function lazyInitializer(payload) {
          if (-1 === payload._status) {
            var ioInfo = payload._ioInfo;
            null != ioInfo && (ioInfo.start = ioInfo.end = performance.now());
            ioInfo = payload._result;
            var thenable = ioInfo();
            thenable.then(
              function(moduleObject) {
                if (0 === payload._status || -1 === payload._status) {
                  payload._status = 1;
                  payload._result = moduleObject;
                  var _ioInfo = payload._ioInfo;
                  null != _ioInfo && (_ioInfo.end = performance.now());
                  void 0 === thenable.status && (thenable.status = "fulfilled", thenable.value = moduleObject);
                }
              },
              function(error) {
                if (0 === payload._status || -1 === payload._status) {
                  payload._status = 2;
                  payload._result = error;
                  var _ioInfo2 = payload._ioInfo;
                  null != _ioInfo2 && (_ioInfo2.end = performance.now());
                  void 0 === thenable.status && (thenable.status = "rejected", thenable.reason = error);
                }
              }
            );
            ioInfo = payload._ioInfo;
            if (null != ioInfo) {
              ioInfo.value = thenable;
              var displayName = thenable.displayName;
              "string" === typeof displayName && (ioInfo.name = displayName);
            }
            -1 === payload._status && (payload._status = 0, payload._result = thenable);
          }
          if (1 === payload._status)
            return ioInfo = payload._result, void 0 === ioInfo && console.error(
              "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?",
              ioInfo
            ), "default" in ioInfo || console.error(
              "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))",
              ioInfo
            ), ioInfo.default;
          throw payload._result;
        }
        function resolveDispatcher() {
          var dispatcher = ReactSharedInternals.H;
          null === dispatcher && console.error(
            "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
          );
          return dispatcher;
        }
        function releaseAsyncTransition() {
          ReactSharedInternals.asyncTransitions--;
        }
        function enqueueTask(task) {
          if (null === enqueueTaskImpl)
            try {
              var requireString = ("require" + Math.random()).slice(0, 7);
              enqueueTaskImpl = (module && module[requireString]).call(
                module,
                "timers"
              ).setImmediate;
            } catch (_err) {
              enqueueTaskImpl = function(callback) {
                false === didWarnAboutMessageChannel && (didWarnAboutMessageChannel = true, "undefined" === typeof MessageChannel && console.error(
                  "This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning."
                ));
                var channel = new MessageChannel();
                channel.port1.onmessage = callback;
                channel.port2.postMessage(void 0);
              };
            }
          return enqueueTaskImpl(task);
        }
        function aggregateErrors(errors) {
          return 1 < errors.length && "function" === typeof AggregateError ? new AggregateError(errors) : errors[0];
        }
        function popActScope(prevActQueue, prevActScopeDepth) {
          prevActScopeDepth !== actScopeDepth - 1 && console.error(
            "You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. "
          );
          actScopeDepth = prevActScopeDepth;
        }
        function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
          var queue = ReactSharedInternals.actQueue;
          if (null !== queue)
            if (0 !== queue.length)
              try {
                flushActQueue(queue);
                enqueueTask(function() {
                  return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                });
                return;
              } catch (error) {
                ReactSharedInternals.thrownErrors.push(error);
              }
            else ReactSharedInternals.actQueue = null;
          0 < ReactSharedInternals.thrownErrors.length ? (queue = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(queue)) : resolve(returnValue);
        }
        function flushActQueue(queue) {
          if (!isFlushing) {
            isFlushing = true;
            var i = 0;
            try {
              for (; i < queue.length; i++) {
                var callback = queue[i];
                do {
                  ReactSharedInternals.didUsePromise = false;
                  var continuation = callback(false);
                  if (null !== continuation) {
                    if (ReactSharedInternals.didUsePromise) {
                      queue[i] = callback;
                      queue.splice(0, i);
                      return;
                    }
                    callback = continuation;
                  } else break;
                } while (1);
              }
              queue.length = 0;
            } catch (error) {
              queue.splice(0, i + 1), ReactSharedInternals.thrownErrors.push(error);
            } finally {
              isFlushing = false;
            }
          }
        }
        "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
        var REACT_ELEMENT_TYPE = /* @__PURE__ */ Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = /* @__PURE__ */ Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = /* @__PURE__ */ Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = /* @__PURE__ */ Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = /* @__PURE__ */ Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = /* @__PURE__ */ Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = /* @__PURE__ */ Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = /* @__PURE__ */ Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = /* @__PURE__ */ Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = /* @__PURE__ */ Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = /* @__PURE__ */ Symbol.for("react.memo"), REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = /* @__PURE__ */ Symbol.for("react.activity"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator, didWarnStateUpdateForUnmountedComponent = {}, ReactNoopUpdateQueue = {
          isMounted: function() {
            return false;
          },
          enqueueForceUpdate: function(publicInstance) {
            warnNoop(publicInstance, "forceUpdate");
          },
          enqueueReplaceState: function(publicInstance) {
            warnNoop(publicInstance, "replaceState");
          },
          enqueueSetState: function(publicInstance) {
            warnNoop(publicInstance, "setState");
          }
        }, assign = Object.assign, emptyObject = {};
        Object.freeze(emptyObject);
        Component.prototype.isReactComponent = {};
        Component.prototype.setState = function(partialState, callback) {
          if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
            throw Error(
              "takes an object of state variables to update or a function which returns an object of state variables."
            );
          this.updater.enqueueSetState(this, partialState, callback, "setState");
        };
        Component.prototype.forceUpdate = function(callback) {
          this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
        };
        var deprecatedAPIs = {
          isMounted: [
            "isMounted",
            "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."
          ],
          replaceState: [
            "replaceState",
            "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."
          ]
        };
        for (fnName in deprecatedAPIs)
          deprecatedAPIs.hasOwnProperty(fnName) && defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
        ComponentDummy.prototype = Component.prototype;
        deprecatedAPIs = PureComponent.prototype = new ComponentDummy();
        deprecatedAPIs.constructor = PureComponent;
        assign(deprecatedAPIs, Component.prototype);
        deprecatedAPIs.isPureReactComponent = true;
        var isArrayImpl = Array.isArray, REACT_CLIENT_REFERENCE = /* @__PURE__ */ Symbol.for("react.client.reference"), ReactSharedInternals = {
          H: null,
          A: null,
          T: null,
          S: null,
          actQueue: null,
          asyncTransitions: 0,
          isBatchingLegacy: false,
          didScheduleLegacyUpdate: false,
          didUsePromise: false,
          thrownErrors: [],
          getCurrentStack: null,
          recentlyCreatedOwnerStacks: 0
        }, hasOwnProperty = Object.prototype.hasOwnProperty, createTask = console.createTask ? console.createTask : function() {
          return null;
        };
        deprecatedAPIs = {
          react_stack_bottom_frame: function(callStackForError) {
            return callStackForError();
          }
        };
        var specialPropKeyWarningShown, didWarnAboutOldJSXRuntime;
        var didWarnAboutElementRef = {};
        var unknownOwnerDebugStack = deprecatedAPIs.react_stack_bottom_frame.bind(
          deprecatedAPIs,
          UnknownOwner
        )();
        var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
        var didWarnAboutMaps = false, userProvidedKeyEscapeRegex = /\/+/g, reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
          if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
            var event = new window.ErrorEvent("error", {
              bubbles: true,
              cancelable: true,
              message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
              error
            });
            if (!window.dispatchEvent(event)) return;
          } else if ("object" === typeof process && "function" === typeof process.emit) {
            process.emit("uncaughtException", error);
            return;
          }
          console.error(error);
        }, didWarnAboutMessageChannel = false, enqueueTaskImpl = null, actScopeDepth = 0, didWarnNoAwaitAct = false, isFlushing = false, queueSeveralMicrotasks = "function" === typeof queueMicrotask ? function(callback) {
          queueMicrotask(function() {
            return queueMicrotask(callback);
          });
        } : enqueueTask;
        deprecatedAPIs = Object.freeze({
          __proto__: null,
          c: function(size) {
            return resolveDispatcher().useMemoCache(size);
          }
        });
        var fnName = {
          map: mapChildren,
          forEach: function(children, forEachFunc, forEachContext) {
            mapChildren(
              children,
              function() {
                forEachFunc.apply(this, arguments);
              },
              forEachContext
            );
          },
          count: function(children) {
            var n = 0;
            mapChildren(children, function() {
              n++;
            });
            return n;
          },
          toArray: function(children) {
            return mapChildren(children, function(child) {
              return child;
            }) || [];
          },
          only: function(children) {
            if (!isValidElement(children))
              throw Error(
                "React.Children.only expected to receive a single React element child."
              );
            return children;
          }
        };
        exports.Activity = REACT_ACTIVITY_TYPE;
        exports.Children = fnName;
        exports.Component = Component;
        exports.Fragment = REACT_FRAGMENT_TYPE;
        exports.Profiler = REACT_PROFILER_TYPE;
        exports.PureComponent = PureComponent;
        exports.StrictMode = REACT_STRICT_MODE_TYPE;
        exports.Suspense = REACT_SUSPENSE_TYPE;
        exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
        exports.__COMPILER_RUNTIME = deprecatedAPIs;
        exports.act = function(callback) {
          var prevActQueue = ReactSharedInternals.actQueue, prevActScopeDepth = actScopeDepth;
          actScopeDepth++;
          var queue = ReactSharedInternals.actQueue = null !== prevActQueue ? prevActQueue : [], didAwaitActCall = false;
          try {
            var result = callback();
          } catch (error) {
            ReactSharedInternals.thrownErrors.push(error);
          }
          if (0 < ReactSharedInternals.thrownErrors.length)
            throw popActScope(prevActQueue, prevActScopeDepth), callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
          if (null !== result && "object" === typeof result && "function" === typeof result.then) {
            var thenable = result;
            queueSeveralMicrotasks(function() {
              didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
                "You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);"
              ));
            });
            return {
              then: function(resolve, reject) {
                didAwaitActCall = true;
                thenable.then(
                  function(returnValue) {
                    popActScope(prevActQueue, prevActScopeDepth);
                    if (0 === prevActScopeDepth) {
                      try {
                        flushActQueue(queue), enqueueTask(function() {
                          return recursivelyFlushAsyncActWork(
                            returnValue,
                            resolve,
                            reject
                          );
                        });
                      } catch (error$0) {
                        ReactSharedInternals.thrownErrors.push(error$0);
                      }
                      if (0 < ReactSharedInternals.thrownErrors.length) {
                        var _thrownError = aggregateErrors(
                          ReactSharedInternals.thrownErrors
                        );
                        ReactSharedInternals.thrownErrors.length = 0;
                        reject(_thrownError);
                      }
                    } else resolve(returnValue);
                  },
                  function(error) {
                    popActScope(prevActQueue, prevActScopeDepth);
                    0 < ReactSharedInternals.thrownErrors.length ? (error = aggregateErrors(
                      ReactSharedInternals.thrownErrors
                    ), ReactSharedInternals.thrownErrors.length = 0, reject(error)) : reject(error);
                  }
                );
              }
            };
          }
          var returnValue$jscomp$0 = result;
          popActScope(prevActQueue, prevActScopeDepth);
          0 === prevActScopeDepth && (flushActQueue(queue), 0 !== queue.length && queueSeveralMicrotasks(function() {
            didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
              "A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)"
            ));
          }), ReactSharedInternals.actQueue = null);
          if (0 < ReactSharedInternals.thrownErrors.length)
            throw callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
          return {
            then: function(resolve, reject) {
              didAwaitActCall = true;
              0 === prevActScopeDepth ? (ReactSharedInternals.actQueue = queue, enqueueTask(function() {
                return recursivelyFlushAsyncActWork(
                  returnValue$jscomp$0,
                  resolve,
                  reject
                );
              })) : resolve(returnValue$jscomp$0);
            }
          };
        };
        exports.cache = function(fn) {
          return function() {
            return fn.apply(null, arguments);
          };
        };
        exports.cacheSignal = function() {
          return null;
        };
        exports.captureOwnerStack = function() {
          var getCurrentStack = ReactSharedInternals.getCurrentStack;
          return null === getCurrentStack ? null : getCurrentStack();
        };
        exports.cloneElement = function(element, config, children) {
          if (null === element || void 0 === element)
            throw Error(
              "The argument must be a React element, but you passed " + element + "."
            );
          var props = assign({}, element.props), key = element.key, owner = element._owner;
          if (null != config) {
            var JSCompiler_inline_result;
            a: {
              if (hasOwnProperty.call(config, "ref") && (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(
                config,
                "ref"
              ).get) && JSCompiler_inline_result.isReactWarning) {
                JSCompiler_inline_result = false;
                break a;
              }
              JSCompiler_inline_result = void 0 !== config.ref;
            }
            JSCompiler_inline_result && (owner = getOwner());
            hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key);
            for (propName in config)
              !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
          }
          var propName = arguments.length - 2;
          if (1 === propName) props.children = children;
          else if (1 < propName) {
            JSCompiler_inline_result = Array(propName);
            for (var i = 0; i < propName; i++)
              JSCompiler_inline_result[i] = arguments[i + 2];
            props.children = JSCompiler_inline_result;
          }
          props = ReactElement(
            element.type,
            key,
            props,
            owner,
            element._debugStack,
            element._debugTask
          );
          for (key = 2; key < arguments.length; key++)
            validateChildKeys(arguments[key]);
          return props;
        };
        exports.createContext = function(defaultValue) {
          defaultValue = {
            $$typeof: REACT_CONTEXT_TYPE,
            _currentValue: defaultValue,
            _currentValue2: defaultValue,
            _threadCount: 0,
            Provider: null,
            Consumer: null
          };
          defaultValue.Provider = defaultValue;
          defaultValue.Consumer = {
            $$typeof: REACT_CONSUMER_TYPE,
            _context: defaultValue
          };
          defaultValue._currentRenderer = null;
          defaultValue._currentRenderer2 = null;
          return defaultValue;
        };
        exports.createElement = function(type, config, children) {
          for (var i = 2; i < arguments.length; i++)
            validateChildKeys(arguments[i]);
          i = {};
          var key = null;
          if (null != config)
            for (propName in didWarnAboutOldJSXRuntime || !("__self" in config) || "key" in config || (didWarnAboutOldJSXRuntime = true, console.warn(
              "Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform"
            )), hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key), config)
              hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (i[propName] = config[propName]);
          var childrenLength = arguments.length - 2;
          if (1 === childrenLength) i.children = children;
          else if (1 < childrenLength) {
            for (var childArray = Array(childrenLength), _i = 0; _i < childrenLength; _i++)
              childArray[_i] = arguments[_i + 2];
            Object.freeze && Object.freeze(childArray);
            i.children = childArray;
          }
          if (type && type.defaultProps)
            for (propName in childrenLength = type.defaultProps, childrenLength)
              void 0 === i[propName] && (i[propName] = childrenLength[propName]);
          key && defineKeyPropWarningGetter(
            i,
            "function" === typeof type ? type.displayName || type.name || "Unknown" : type
          );
          var propName = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
          return ReactElement(
            type,
            key,
            i,
            getOwner(),
            propName ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
            propName ? createTask(getTaskName(type)) : unknownOwnerDebugTask
          );
        };
        exports.createRef = function() {
          var refObject = { current: null };
          Object.seal(refObject);
          return refObject;
        };
        exports.forwardRef = function(render) {
          null != render && render.$$typeof === REACT_MEMO_TYPE ? console.error(
            "forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...))."
          ) : "function" !== typeof render ? console.error(
            "forwardRef requires a render function but was given %s.",
            null === render ? "null" : typeof render
          ) : 0 !== render.length && 2 !== render.length && console.error(
            "forwardRef render functions accept exactly two parameters: props and ref. %s",
            1 === render.length ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined."
          );
          null != render && null != render.defaultProps && console.error(
            "forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?"
          );
          var elementType = { $$typeof: REACT_FORWARD_REF_TYPE, render }, ownName;
          Object.defineProperty(elementType, "displayName", {
            enumerable: false,
            configurable: true,
            get: function() {
              return ownName;
            },
            set: function(name) {
              ownName = name;
              render.name || render.displayName || (Object.defineProperty(render, "name", { value: name }), render.displayName = name);
            }
          });
          return elementType;
        };
        exports.isValidElement = isValidElement;
        exports.lazy = function(ctor) {
          ctor = { _status: -1, _result: ctor };
          var lazyType = {
            $$typeof: REACT_LAZY_TYPE,
            _payload: ctor,
            _init: lazyInitializer
          }, ioInfo = {
            name: "lazy",
            start: -1,
            end: -1,
            value: null,
            owner: null,
            debugStack: Error("react-stack-top-frame"),
            debugTask: console.createTask ? console.createTask("lazy()") : null
          };
          ctor._ioInfo = ioInfo;
          lazyType._debugInfo = [{ awaited: ioInfo }];
          return lazyType;
        };
        exports.memo = function(type, compare) {
          null == type && console.error(
            "memo: The first argument must be a component. Instead received: %s",
            null === type ? "null" : typeof type
          );
          compare = {
            $$typeof: REACT_MEMO_TYPE,
            type,
            compare: void 0 === compare ? null : compare
          };
          var ownName;
          Object.defineProperty(compare, "displayName", {
            enumerable: false,
            configurable: true,
            get: function() {
              return ownName;
            },
            set: function(name) {
              ownName = name;
              type.name || type.displayName || (Object.defineProperty(type, "name", { value: name }), type.displayName = name);
            }
          });
          return compare;
        };
        exports.startTransition = function(scope) {
          var prevTransition = ReactSharedInternals.T, currentTransition = {};
          currentTransition._updatedFibers = /* @__PURE__ */ new Set();
          ReactSharedInternals.T = currentTransition;
          try {
            var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
            null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
            "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && (ReactSharedInternals.asyncTransitions++, returnValue.then(releaseAsyncTransition, releaseAsyncTransition), returnValue.then(noop, reportGlobalError));
          } catch (error) {
            reportGlobalError(error);
          } finally {
            null === prevTransition && currentTransition._updatedFibers && (scope = currentTransition._updatedFibers.size, currentTransition._updatedFibers.clear(), 10 < scope && console.warn(
              "Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table."
            )), null !== prevTransition && null !== currentTransition.types && (null !== prevTransition.types && prevTransition.types !== currentTransition.types && console.error(
              "We expected inner Transitions to have transferred the outer types set and that you cannot add to the outer Transition while inside the inner.This is a bug in React."
            ), prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
          }
        };
        exports.unstable_useCacheRefresh = function() {
          return resolveDispatcher().useCacheRefresh();
        };
        exports.use = function(usable) {
          return resolveDispatcher().use(usable);
        };
        exports.useActionState = function(action, initialState, permalink) {
          return resolveDispatcher().useActionState(
            action,
            initialState,
            permalink
          );
        };
        exports.useCallback = function(callback, deps) {
          return resolveDispatcher().useCallback(callback, deps);
        };
        exports.useContext = function(Context) {
          var dispatcher = resolveDispatcher();
          Context.$$typeof === REACT_CONSUMER_TYPE && console.error(
            "Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?"
          );
          return dispatcher.useContext(Context);
        };
        exports.useDebugValue = function(value, formatterFn) {
          return resolveDispatcher().useDebugValue(value, formatterFn);
        };
        exports.useDeferredValue = function(value, initialValue) {
          return resolveDispatcher().useDeferredValue(value, initialValue);
        };
        exports.useEffect = function(create, deps) {
          null == create && console.warn(
            "React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?"
          );
          return resolveDispatcher().useEffect(create, deps);
        };
        exports.useEffectEvent = function(callback) {
          return resolveDispatcher().useEffectEvent(callback);
        };
        exports.useId = function() {
          return resolveDispatcher().useId();
        };
        exports.useImperativeHandle = function(ref, create, deps) {
          return resolveDispatcher().useImperativeHandle(ref, create, deps);
        };
        exports.useInsertionEffect = function(create, deps) {
          null == create && console.warn(
            "React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?"
          );
          return resolveDispatcher().useInsertionEffect(create, deps);
        };
        exports.useLayoutEffect = function(create, deps) {
          null == create && console.warn(
            "React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?"
          );
          return resolveDispatcher().useLayoutEffect(create, deps);
        };
        exports.useMemo = function(create, deps) {
          return resolveDispatcher().useMemo(create, deps);
        };
        exports.useOptimistic = function(passthrough, reducer) {
          return resolveDispatcher().useOptimistic(passthrough, reducer);
        };
        exports.useReducer = function(reducer, initialArg, init) {
          return resolveDispatcher().useReducer(reducer, initialArg, init);
        };
        exports.useRef = function(initialValue) {
          return resolveDispatcher().useRef(initialValue);
        };
        exports.useState = function(initialState) {
          return resolveDispatcher().useState(initialState);
        };
        exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
          return resolveDispatcher().useSyncExternalStore(
            subscribe,
            getSnapshot,
            getServerSnapshot
          );
        };
        exports.useTransition = function() {
          return resolveDispatcher().useTransition();
        };
        exports.version = "19.2.5";
        "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
      })();
    }
  });

  // node_modules/react/index.js
  var require_react = __commonJS({
    "node_modules/react/index.js"(exports, module) {
      "use strict";
      if (false) {
        module.exports = null;
      } else {
        module.exports = require_react_development();
      }
    }
  });

  // packages/Epoch.WASM.React/dist/index.js
  var require_dist = __commonJS({
    "packages/Epoch.WASM.React/dist/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.createMemoryEpochReactStorage = createMemoryEpochReactStorage;
      exports.createMemoryEpochVfs = createMemoryEpochVfs;
      exports.createEpochReactStore = createEpochReactStore;
      exports.useEpochState = useEpochState;
      exports.createEpochLiveRepository = createEpochLiveRepository;
      exports.useEpochHistory = useEpochHistory;
      exports.useEpochEntity = useEpochEntity;
      exports.useEpochView = useEpochView;
      exports.stableJson = stableJson2;
      exports.isRecord = isRecord6;
      var react_1 = require_react();
      function __epochIsFunction2(value) {
        return typeof value === "function";
      }
      function __epochIsNumber5(value) {
        return typeof value === "number";
      }
      function __epochIsString8(value) {
        return typeof value === "string";
      }
      function __epochIsUndefined(value) {
        return typeof value === "undefined";
      }
      function createMemoryEpochReactStorage(initial = {}) {
        const values = new Map(Object.entries(initial));
        return {
          getItem: (key) => values.get(key) ?? null,
          setItem: (key, value) => {
            values.set(key, value);
          },
          removeItem: (key) => {
            values.delete(key);
          }
        };
      }
      function createMemoryEpochVfs(initial = {}) {
        const files = new Map(Object.entries(initial));
        return {
          readFile: (path) => files.get(path),
          writeFile: (path, content) => {
            files.set(path, content);
          },
          deleteFile: (path) => {
            files.delete(path);
          },
          listFiles: (prefix = "") => [...files.keys()].filter((path) => path.startsWith(prefix)).sort()
        };
      }
      function createEpochReactStore(options) {
        const entity = requireNonEmpty(options.entity, "entity");
        const author = options.author ?? "react";
        const storage = options.storage ?? browserStorage() ?? createMemoryEpochReactStorage();
        const storageKey = options.storageKey;
        const replicaId = options.replicaId ?? stableId(author);
        const listeners = /* @__PURE__ */ new Set();
        const initialState = normalizeState(options.initialState);
        let events = storageKey === void 0 ? [] : loadPersisted(storage, storageKey, entity);
        let cursor = "latest";
        let snapshot;
        if (events.length === 0) {
          events = appendOperations([], operationsForState(entity, asRecord(initialState)), author, replicaId);
          persist();
        }
        snapshot = computeSnapshot();
        function getSnapshot() {
          return snapshot;
        }
        function subscribe(listener) {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        }
        function setState(update) {
          const nextState = normalizeState(resolveStateUpdate(update, snapshot.state));
          const operations = diffStates(entity, asRecord(snapshot.state), asRecord(nextState));
          if (operations.length === 0)
            return { state: snapshot.state, events: [] };
          const appended = appendOperations(events, operations, author, replicaId);
          events = appended;
          const changeEvents = appended.slice(-operations.length);
          cursor = "latest";
          persist();
          refresh();
          return { state: snapshot.state, events: changeEvents };
        }
        function rewind(target) {
          cursor = normalizeTarget(target, events);
          refresh();
        }
        function materialize(target = cursor) {
          return materializeState(entity, eventsForTarget(events, normalizeTarget(target, events)));
        }
        function history() {
          return events;
        }
        function refresh() {
          const next = computeSnapshot();
          const changed = next.cursor !== snapshot.cursor || stableJson2(next.state) !== stableJson2(snapshot.state) || next.events.length !== snapshot.events.length;
          snapshot = next;
          if (changed)
            notify();
        }
        function computeSnapshot() {
          const selectedEvents = eventsForTarget(events, cursor);
          return {
            state: materializeState(entity, selectedEvents),
            events,
            cursor,
            currentEventId: selectedEvents.at(-1)?.id
          };
        }
        function persist() {
          if (storageKey === void 0)
            return;
          storage.setItem(storageKey, JSON.stringify({ version: 1, entity, events }));
        }
        function notify() {
          for (const listener of listeners)
            listener();
        }
        return {
          getSnapshot,
          subscribe,
          setState,
          rewind,
          materialize,
          history,
          get snapshot() {
            return snapshot;
          }
        };
      }
      function useEpochState(store) {
        const snapshot = (0, react_1.useSyncExternalStore)(store.subscribe, store.getSnapshot, store.getSnapshot);
        const setState = (0, react_1.useCallback)((update) => store.setState(update), [store]);
        const controls = (0, react_1.useMemo)(() => ({
          snapshot,
          rewind: store.rewind,
          materialize: store.materialize,
          history: store.history
        }), [snapshot, store]);
        return [snapshot.state, setState, controls];
      }
      function createEpochLiveRepository(options) {
        const vfs = options.vfs;
        const author = options.author ?? "browser";
        const root = normalizeVfsRoot(options.root ?? "/.epoch-live");
        const listeners = /* @__PURE__ */ new Set();
        let historySnapshot = loadHistory();
        let entitySnapshots = materializeLiveEntities(historySnapshot);
        function append(entity2, value) {
          const cleanEntity = requireNonEmpty(entity2, "live entity");
          const payload = normalizeState(value);
          const lamport = history().length + 1;
          const event = {
            id: `epoch-live-${lamport}-${hashString(stableJson2({ author, cleanEntity, payload, lamport }))}`,
            type: "entity",
            entity: cleanEntity,
            author,
            lamport,
            payload
          };
          vfs.writeFile(eventPath(root, event.id), JSON.stringify(event));
          refresh();
          notify();
          return event;
        }
        function entity(name) {
          return entitySnapshots.get(name) ?? emptyLiveEntity;
        }
        function history() {
          return historySnapshot;
        }
        function view() {
          return {
            events: historySnapshot,
            entities: Object.fromEntries(entitySnapshots.entries())
          };
        }
        function loadHistory() {
          return vfs.listFiles(eventsRoot(root)).map((path) => parseLiveEvent(vfs.readFile(path))).filter((event) => event !== void 0).sort((left, right) => left.lamport - right.lamport || left.id.localeCompare(right.id));
        }
        function subscribe(listener) {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        }
        function syncFrom(peer) {
          let copied = 0;
          for (const path of peer.listFiles(eventsRoot(root))) {
            if (vfs.readFile(path) !== void 0)
              continue;
            const content = peer.readFile(path);
            if (content === void 0)
              continue;
            vfs.writeFile(path, content);
            copied += 1;
          }
          if (copied > 0) {
            refresh();
            notify();
          }
          return copied;
        }
        function refresh() {
          historySnapshot = loadHistory();
          entitySnapshots = materializeLiveEntities(historySnapshot);
        }
        function notify() {
          for (const listener of listeners)
            listener();
        }
        return { append, entity, history, view, subscribe, syncFrom };
      }
      function useEpochHistory(repository) {
        return (0, react_1.useSyncExternalStore)(repository.subscribe, repository.history, repository.history);
      }
      function useEpochEntity(repository, entity) {
        return (0, react_1.useSyncExternalStore)(repository.subscribe, () => repository.entity(entity), () => repository.entity(entity));
      }
      function useEpochView(repository) {
        return (0, react_1.useSyncExternalStore)(repository.subscribe, repository.view, repository.view);
      }
      function reactEventPayload(operation, replicaId, lamport) {
        return {
          backend: "epoch-react",
          entity: operation.entity,
          // SAFETY: EpochReactOperation is JSON-serializable and stored as dictionary payload.
          operation,
          replica_id: hashString(stableJson2({ replicaId, lamport, operation })).padStart(8, "0").slice(0, 32)
        };
      }
      function appendOperations(existing, operations, author, replicaId) {
        const next = [...existing];
        for (const operation of operations) {
          const lamport = next.length + 1;
          const payload = reactEventPayload(operation, replicaId, lamport);
          next.push({
            id: `epoch-react-${lamport}-${hashString(stableJson2(payload))}`,
            type: "crdt",
            author,
            lamport,
            payload
          });
        }
        return next;
      }
      function operationsForState(entity, state) {
        return Object.entries(state).filter(([, value]) => value !== void 0).map(([key, value]) => ({ kind: "map-set", entity, key, value }));
      }
      function diffStates(entity, previous, next) {
        const operations = [];
        const keys = [.../* @__PURE__ */ new Set([...Object.keys(previous), ...Object.keys(next)])].sort();
        for (const key of keys) {
          if (!(key in next) || next[key] === void 0) {
            if (key in previous)
              operations.push({ kind: "map-delete", entity, key });
            continue;
          }
          if (!(key in previous) || stableJson2(previous[key]) !== stableJson2(next[key])) {
            operations.push({ kind: "map-set", entity, key, value: next[key] });
          }
        }
        return operations;
      }
      function materializeState(entity, events) {
        if (events.length === 0)
          return (
            /* SAFETY: Runtime validation immediately surrounding this expression establishes the asserted contract. */
            {}
          );
        const state = {};
        for (const event of events) {
          const operation = event.payload.operation;
          if (!isReactOperation(operation) || operation.entity !== entity)
            continue;
          if (operation.kind === "map-delete") {
            delete state[operation.key];
          } else if ("value" in operation) {
            state[operation.key] = operation.value;
          }
        }
        return normalizeState(state);
      }
      function resolveStateUpdate(update, state) {
        const candidate = update;
        if (__epochIsFunction2(candidate)) {
          const updater = update;
          return updater(state);
        }
        return update;
      }
      function eventsForTarget(events, target) {
        if (target === "latest")
          return events;
        if (__epochIsNumber5(target))
          return events.slice(0, clampEventCount(target, events.length));
        const index = events.findIndex((event) => event.id === target);
        if (index === -1)
          throw new Error(`unknown Epoch React event '${target}'`);
        return events.slice(0, index + 1);
      }
      function normalizeVfsRoot(root) {
        const trimmed = root.replace(/\/+$/u, "");
        return trimmed.length === 0 ? "/.epoch-live" : trimmed;
      }
      function eventsRoot(root) {
        return `${root}/events/`;
      }
      function eventPath(root, eventId) {
        return `${eventsRoot(root)}${eventId}.json`;
      }
      function parseLiveEvent(raw) {
        if (raw === void 0)
          return void 0;
        const parsed = JSON.parse(raw);
        if (parsed.type !== "entity" || !__epochIsString8(parsed.id) || !__epochIsString8(parsed.entity) || !__epochIsString8(parsed.author) || !__epochIsNumber5(parsed.lamport) || !isRecord6(parsed.payload)) {
          throw new Error("invalid Epoch live repository event");
        }
        return {
          id: parsed.id,
          type: "entity",
          entity: parsed.entity,
          author: parsed.author,
          lamport: parsed.lamport,
          payload: normalizeState(parsed.payload)
        };
      }
      var emptyLiveEntity = {};
      function materializeLiveEntities(events) {
        const entities = /* @__PURE__ */ new Map();
        for (const event of events)
          entities.set(event.entity, normalizeState(event.payload));
        return entities;
      }
      function normalizeTarget(target, events) {
        if (target === "latest")
          return target;
        if (__epochIsNumber5(target))
          return clampEventCount(target, events.length);
        if (!events.some((event) => event.id === target))
          throw new Error(`unknown Epoch React event '${target}'`);
        return target;
      }
      function loadPersisted(storage, storageKey, entity) {
        const raw = storage.getItem(storageKey);
        if (raw === null)
          return [];
        const parsed = JSON.parse(raw);
        if (parsed.version !== 1 || parsed.entity !== entity || !Array.isArray(parsed.events)) {
          throw new Error(`invalid Epoch React storage payload for '${storageKey}'`);
        }
        return parsed.events.map((event) => ({
          id: requireNonEmpty(event.id, "event id"),
          type: "crdt",
          author: requireNonEmpty(event.author, "event author"),
          lamport: requireNumber(event.lamport, "event lamport"),
          payload: requireRecord(event.payload, "event payload")
        }));
      }
      function browserStorage() {
        return __epochIsUndefined(globalThis.localStorage) ? void 0 : globalThis.localStorage;
      }
      function normalizeState(value) {
        if (!isRecord6(value))
          throw new TypeError("Epoch React state must be a JSON object");
        return JSON.parse(JSON.stringify(value));
      }
      function stableId(value) {
        return hashString(value).padStart(8, "0").slice(0, 32);
      }
      function stableJson2(value) {
        if (value === void 0)
          return "null";
        if (Array.isArray(value))
          return `[${value.map((item) => stableJson2(item)).join(",")}]`;
        if (isRecord6(value))
          return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson2(value[key])}`).join(",")}}`;
        return JSON.stringify(value);
      }
      function hashString(value) {
        let hash = 2166136261;
        for (let index = 0; index < value.length; index += 1) {
          hash ^= value.charCodeAt(index);
          hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16);
      }
      function clampEventCount(count, length) {
        if (!Number.isInteger(count))
          throw new Error("Epoch React rewind count must be an integer");
        return Math.max(0, Math.min(count, length));
      }
      function requireNonEmpty(value, label) {
        if (!__epochIsString8(value) || value.length === 0)
          throw new Error(`invalid Epoch React ${label}`);
        return value;
      }
      function requireNumber(value, label) {
        if (!__epochIsNumber5(value) || !Number.isFinite(value))
          throw new Error(`invalid Epoch React ${label}`);
        return value;
      }
      function requireRecord(value, label) {
        if (!isRecord6(value))
          throw new Error(`invalid Epoch React ${label}`);
        return value;
      }
      function asRecord(value) {
        if (!isRecord6(value))
          throw new TypeError("Epoch React state must be a JSON object");
        return value;
      }
      function isRecord6(value) {
        return typeof value === "object" && value !== null && !Array.isArray(value);
      }
      function isReactOperation(value) {
        if (!isRecord6(value) || typeof value.entity !== "string" || typeof value.key !== "string")
          return false;
        return value.kind === "map-delete" || value.kind === "map-set";
      }
    }
  });

  // packages/Epoch.Integration.Core/dist/index.js
  var require_dist2 = __commonJS({
    "packages/Epoch.Integration.Core/dist/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.stableJson = exports.isRecord = void 0;
      exports.createBrowserEpoch = createBrowserEpoch2;
      exports.createMemoryEpochIntegrationStorage = createMemoryEpochIntegrationStorage;
      exports.createStorageEpochVfs = createStorageEpochVfs;
      exports.readOptionalTrackedEntityFromRepository = readOptionalTrackedEntityFromRepository;
      exports.versionLedgerFromRepository = versionLedgerFromRepository;
      var wasm_react_1 = require_dist();
      Object.defineProperty(exports, "isRecord", { enumerable: true, get: function() {
        return wasm_react_1.isRecord;
      } });
      Object.defineProperty(exports, "stableJson", { enumerable: true, get: function() {
        return wasm_react_1.stableJson;
      } });
      function createBrowserEpoch2(options) {
        const namespace = requireNonEmpty(options.namespace, "namespace");
        const author = requireNonEmpty(options.author, "author");
        const storage = options.storage ?? browserStorage();
        const vfs = storage === void 0 ? (0, wasm_react_1.createMemoryEpochVfs)() : createStorageEpochVfs(storage, `epoch:${namespace}:`);
        const repository = (0, wasm_react_1.createEpochLiveRepository)({ vfs, author });
        function trackChange(input) {
          const entity = requireNonEmpty(input.entity, "tracked entity");
          const revision = nextRevision(repository, entity);
          const change = normalizeJson({
            kind: "tracked-change",
            surface: requireNonEmpty(input.surface, "tracked surface"),
            source: requireNonEmpty(input.source, "tracked source"),
            revision,
            summary: requireNonEmpty(input.summary, "tracked summary"),
            payload: input.payload,
            metadata: input.metadata
          });
          const event = repository.append(entity, trackedChangeRecord(change));
          return {
            event,
            revision,
            change,
            ledgerEntry: ledgerEntryFromEvent(event, change)
          };
        }
        function readTrackedEntity(entity) {
          const tracked = readOptionalTrackedEntityFromRepository(repository, entity);
          if (tracked === void 0)
            throw new Error(`Epoch tracked entity '${entity}' has no tracked changes.`);
          return tracked;
        }
        function readOptionalTrackedEntity(entity) {
          return readOptionalTrackedEntityFromRepository(repository, entity);
        }
        function versionLedger(entity) {
          return versionLedgerFromRepository(repository, entity);
        }
        return {
          namespace,
          author,
          vfs,
          repository,
          trackChange,
          readTrackedEntity,
          readOptionalTrackedEntity,
          versionLedger,
          subscribe: repository.subscribe
        };
      }
      function createMemoryEpochIntegrationStorage(initial = {}) {
        const values = new Map(Object.entries(initial));
        return {
          get length() {
            return values.size;
          },
          key: (index) => [...values.keys()][index] ?? null,
          getItem: (key) => values.get(key) ?? null,
          setItem: (key, value) => {
            values.set(key, value);
          },
          removeItem: (key) => {
            values.delete(key);
          }
        };
      }
      function createStorageEpochVfs(storage, prefix) {
        return {
          readFile: (path) => storage.getItem(storageKey(prefix, path)) ?? void 0,
          writeFile: (path, content) => {
            storage.setItem(storageKey(prefix, path), content);
          },
          deleteFile: (path) => {
            storage.removeItem(storageKey(prefix, path));
          },
          listFiles: (pathPrefix = "") => {
            const paths = [];
            for (let index = 0; index < storage.length; index += 1) {
              const key = storage.key(index);
              if (key === null || !key.startsWith(prefix))
                continue;
              const path = key.slice(prefix.length);
              if (path.startsWith(pathPrefix))
                paths.push(path);
            }
            return paths.sort();
          }
        };
      }
      function readOptionalTrackedEntityFromRepository(repository, entity) {
        const value = repository.entity(entity);
        return isTrackedChange(value) ? value : void 0;
      }
      function versionLedgerFromRepository(repository, entity) {
        return repository.history().filter((event) => event.entity === entity && isTrackedChange(event.payload)).map((event) => ledgerEntryFromEvent(event, assertTrackedChange(event.payload)));
      }
      function nextRevision(repository, entity) {
        const latest = versionLedgerFromRepository(repository, entity).at(-1);
        return latest === void 0 ? 1 : latest.revision + 1;
      }
      function ledgerEntryFromEvent(event, change) {
        return {
          revision: change.revision,
          eventId: event.id,
          surface: change.surface,
          source: change.source,
          summary: change.summary,
          metadata: change.metadata
        };
      }
      function browserStorage() {
        try {
          const candidate = globalThis.localStorage;
          if (candidate === void 0)
            return void 0;
          return {
            get length() {
              return candidate.length;
            },
            key: (index) => candidate.key(index),
            getItem: (key) => candidate.getItem(key),
            setItem: (key, value) => {
              candidate.setItem(key, value);
            },
            removeItem: (key) => {
              candidate.removeItem(key);
            }
          };
        } catch {
          return void 0;
        }
      }
      function storageKey(prefix, path) {
        return `${prefix}${path}`;
      }
      function normalizeJson(value) {
        return JSON.parse(JSON.stringify(value));
      }
      function requireNonEmpty(value, label) {
        if (value.trim().length === 0)
          throw new Error(`Epoch ${label} is required.`);
        return value;
      }
      function isTrackedChange(value) {
        return (0, wasm_react_1.isRecord)(value) && value.kind === "tracked-change" && typeof value.surface === "string" && typeof value.source === "string" && typeof value.revision === "number" && typeof value.summary === "string" && "payload" in value;
      }
      function trackedChangeRecord(change) {
        const record = {
          kind: change.kind,
          surface: change.surface,
          source: change.source,
          revision: change.revision,
          summary: change.summary,
          // SAFETY: Repository append accepts dictionary-serializable tracked payloads.
          payload: change.payload
        };
        if (change.metadata !== void 0) {
          return { ...record, metadata: change.metadata };
        }
        return record;
      }
      function assertTrackedChange(value) {
        if (!isTrackedChange(value))
          throw new Error("Expected tracked change payload");
        return value;
      }
    }
  });

  // packages/Epoch.Community.Runtime/src/index.ts
  var index_exports = {};
  __export(index_exports, {
    AtprotoOAuthError: () => AtprotoOAuthError,
    DEFAULT_LIVE_ACTION_CATALOG: () => DEFAULT_LIVE_ACTION_CATALOG,
    DEFAULT_PROJECT_SLUG: () => DEFAULT_PROJECT_SLUG,
    DEFAULT_STREAM_IGNORE: () => DEFAULT_STREAM_IGNORE,
    DEFAULT_WEBMCP_EXCLUDED_KINDS: () => DEFAULT_WEBMCP_EXCLUDED_KINDS,
    EpochCommandError: () => EpochCommandError,
    IMMUTABLE_LIVE_DENY_PATHS: () => IMMUTABLE_LIVE_DENY_PATHS,
    LIVE_POLICY_BOUNDS: () => LIVE_POLICY_BOUNDS,
    LIVE_SANITIZER_BOUNDS: () => LIVE_SANITIZER_BOUNDS,
    STREAM_CIPHER_ALPHABET: () => STREAM_CIPHER_ALPHABET,
    STREAM_CIPHER_WIDTH: () => STREAM_CIPHER_WIDTH,
    TRUNK_VIEW: () => TRUNK_VIEW,
    activityFromParticipantEvents: () => activityFromParticipantEvents,
    appendSocialRevision: () => appendSocialRevision,
    beginAtprotoAuthorization: () => beginAtprotoAuthorization,
    cipherToken: () => cipherToken,
    classifyLivePolicyChange: () => classifyLivePolicyChange,
    communityRuntimeUsage: () => communityRuntimeUsage,
    compileLiveRewriteRules: () => compileLiveRewriteRules,
    composerOwnsLetter: () => composerOwnsLetter,
    createBrowserEpochWorkspace: () => createBrowserEpochWorkspace,
    createCommandReceipt: () => createCommandReceipt,
    createCommunityCommandBus: () => createCommunityCommandBus,
    createCommunityRuntime: () => createCommunityRuntime,
    createInMemoryLiveTransport: () => createInMemoryLiveTransport,
    createLiveActionCatalog: () => createLiveActionCatalog,
    createLivePresentationClient: () => createLivePresentationClient,
    createLivePresentationPublisher: () => createLivePresentationPublisher,
    createLiveSpaceClient: () => createLiveSpaceClient,
    createLiveSpaceCommandExtensions: () => createLiveSpaceCommandExtensions,
    createLiveSpectatorProjection: () => createLiveSpectatorProjection,
    createLocalLiveSpacePort: () => createLocalLiveSpacePort,
    createStaticHarnessRelease: () => createStaticHarnessRelease,
    createWebMcpTools: () => createWebMcpTools,
    defaultCommunityHarness: () => defaultCommunityHarness,
    describeCatalog: () => describeCatalog,
    describeReceiptBlade: () => describeReceiptBlade,
    diffDynamicUiManifests: () => diffDynamicUiManifests,
    digestOf: () => digestOf,
    ensureProject: () => ensureProject,
    evaluateLiveForkEligibility: () => evaluateLiveForkEligibility,
    evaluateLivePath: () => evaluateLivePath,
    executeCommunityRuntimeCommand: () => executeCommunityRuntimeCommand,
    exportWorkspaceBundle: () => exportWorkspaceBundle,
    feedEntity: () => feedEntity,
    findComponent: () => findComponent,
    findSlot: () => findSlot,
    finishAtprotoAuthorization: () => finishAtprotoAuthorization,
    historyOf: () => historyOf,
    honestAgentStatus: () => honestAgentStatus,
    identifier: () => identifier,
    importWorkspaceBundle: () => importWorkspaceBundle,
    isCommunityRuntimeInvocation: () => isCommunityRuntimeInvocation,
    isDynamicUiManifest: () => isDynamicUiManifest,
    isHandleHashStub: () => isHandleHashStub,
    isImmutablyDeniedLivePath: () => isImmutablyDeniedLivePath,
    isLiveConsentScope: () => isLiveConsentScope,
    isLiveLifecycle: () => isLiveLifecycle,
    isLiveLifecycleCommand: () => isLiveLifecycleCommand,
    isLiveSecurityMode: () => isLiveSecurityMode,
    isLiveVisibility: () => isLiveVisibility,
    isProtectedStreamTarget: () => isProtectedStreamTarget,
    isSecretKeyName: () => isSecretKeyName,
    isSpectatorViewPreference: () => isSpectatorViewPreference,
    jumpChooserShouldOpen: () => jumpChooserShouldOpen,
    letterSteersBoard: () => letterSteersBoard,
    listFeeds: () => listFeeds,
    listProjects: () => listProjects,
    livePolicyDigest: () => livePolicyDigest,
    nextLiveLifecycle: () => nextLiveLifecycle,
    normalizeAtprotoHandle: () => normalizeAtprotoHandle,
    normalizeLivePath: () => normalizeLivePath,
    normalizeLivePublicationPolicy: () => normalizeLivePublicationPolicy,
    openBoardReceipt: () => openBoardReceipt,
    openDurableStorage: () => openDurableStorage,
    parseBoardReceiptLocator: () => parseBoardReceiptLocator,
    parseStreamIgnore: () => parseStreamIgnore,
    parseStreamRewrite: () => parseStreamRewrite,
    pathIsStreamIgnored: () => pathIsStreamIgnored,
    pathMatchesLivePattern: () => pathMatchesLivePattern,
    policyReceipt: () => policyReceipt,
    preservedSearchAfterJump: () => preservedSearchAfterJump,
    projectEntity: () => projectEntity,
    readProject: () => readProject,
    recordsOf: () => recordsOf,
    registerWebMcpTools: () => registerWebMcpTools,
    replayStreamCommand: () => replayStreamCommand,
    requireScopedTarget: () => requireScopedTarget,
    resolveBrowserIdentity: () => resolveBrowserIdentity,
    revisionsOf: () => revisionsOf,
    runLivePreflight: () => runLivePreflight,
    sanitizeLiveArgs: () => sanitizeLiveArgs,
    sanitizeStreamCommand: () => sanitizeStreamCommand,
    setCliBundleReader: () => setCliBundleReader,
    skippedValidation: () => skippedValidation,
    summarizeReceipt: () => summarizeReceipt,
    toolName: () => toolName,
    validateDynamicUiManifest: () => validateDynamicUiManifest,
    validationReceipt: () => validationReceipt,
    verifyStaticHarnessRelease: () => verifyStaticHarnessRelease,
    viewRef: () => viewRef
  });

  // packages/Epoch.Community.Runtime/src/digest.ts
  var import_integration_core = __toESM(require_dist2());
  function digestOf(value) {
    return fnv1a((0, import_integration_core.stableJson)(value));
  }
  function identifier(prefix, value) {
    return `${prefix}_${digestOf(value)}`;
  }
  function fnv1a(input) {
    let high = 33826;
    let low = 21285;
    for (let index = 0; index < input.length; index += 1) {
      const code = input.charCodeAt(index);
      low ^= code & 65535;
      high ^= code >>> 16 & 65535;
      const lowProduct = low * 435;
      const highProduct = high * 435 + (lowProduct / 65536 | 0);
      low = lowProduct & 65535;
      high = highProduct & 65535;
    }
    return `${hex(high)}${hex(low)}`;
  }
  function hex(value) {
    return (value >>> 0).toString(16).padStart(4, "0");
  }

  // packages/Epoch.Community.Runtime/src/receipts.ts
  var EpochCommandError = class extends Error {
    constructor(code, message2) {
      super(message2);
      __publicField(this, "code");
      this.name = "EpochCommandError";
      this.code = code;
    }
  };
  function createCommandReceipt(input) {
    const commandId = identifier("cmd", {
      kind: input.kind,
      actor: input.actor,
      workspace: input.workspaceId,
      sequence: input.sequence,
      input: input.input
    });
    return {
      commandId,
      kind: input.kind,
      source: input.source,
      actor: input.actor,
      workspaceId: input.workspaceId,
      readOnly: input.readOnly,
      ...!(input.baseRef === void 0) && { baseRef: input.baseRef },
      ...!(input.proposalRef === void 0) && { proposalRef: input.proposalRef },
      ...!(input.changeId === void 0) && { changeId: input.changeId },
      revisionIds: input.revisionIds ?? [],
      eventIds: input.eventIds ?? [],
      policy: input.policy,
      validation: input.validation,
      confirmation: input.confirmation,
      timestamp: input.timestamp,
      data: input.data
    };
  }
  function policyReceipt(decision, capability, reason) {
    return {
      decision,
      capability,
      receiptId: identifier("pol", { decision, capability, reason: reason ?? null }),
      ...!(reason === void 0) && { reason }
    };
  }
  var skippedValidation = {
    state: "skipped",
    receiptIds: [],
    errors: []
  };
  function validationReceipt(subject, errors) {
    return {
      state: errors.length === 0 ? "valid" : "invalid",
      receiptIds: [identifier("val", { subject, errors })],
      errors
    };
  }

  // packages/Epoch.Community.Runtime/src/harness.ts
  function createStaticHarnessRelease(input) {
    if (input.slots.length === 0) throw new Error("A static harness release requires at least one slot.");
    if (input.components.length === 0) throw new Error("A static harness release requires at least one component.");
    const body = {
      abiVersion: input.abiVersion,
      slots: input.slots,
      components: input.components,
      themeTokens: input.themeTokens,
      safeModeManifest: input.safeModeManifest
    };
    return {
      ...body,
      releaseId: `harness_${digestOf(body)}`,
      digest: digestOf(body)
    };
  }
  function verifyStaticHarnessRelease(release) {
    return digestOf({
      abiVersion: release.abiVersion,
      slots: release.slots,
      components: release.components,
      themeTokens: release.themeTokens,
      safeModeManifest: release.safeModeManifest
    }) === release.digest;
  }
  function findSlot(release, slotId) {
    return release.slots.find((slot) => slot.id === slotId);
  }
  function findComponent(release, componentId) {
    return release.components.find((component) => component.id === componentId);
  }

  // packages/Epoch.Community.Runtime/src/ui.ts
  var import_integration_core2 = __toESM(require_dist2());
  function __epochIsString(value) {
    return typeof value === "string";
  }
  var unsafeThemeValue = /url\(|javascript:|expression\(|[<>;{}]/iu;
  function validateDynamicUiManifest(manifest, release) {
    const errors = [];
    if (manifest.abiVersion !== release.abiVersion) {
      errors.push(`manifest targets harness ABI ${manifest.abiVersion}, installed harness is ABI ${release.abiVersion}`);
    }
    const perSlot = /* @__PURE__ */ new Map();
    for (const placement of manifest.placements) {
      const slot = findSlot(release, placement.slot);
      if (slot === void 0) {
        errors.push(`unknown slot '${placement.slot}'`);
        continue;
      }
      const component = findComponent(release, placement.component);
      if (component === void 0) {
        errors.push(`unknown component '${placement.component}'`);
        continue;
      }
      if (!slot.accepts.includes(component.category)) {
        errors.push(`slot '${slot.id}' does not accept category '${component.category}'`);
      }
      const used = (perSlot.get(slot.id) ?? 0) + 1;
      perSlot.set(slot.id, used);
      if (used > slot.maxComponents) {
        errors.push(`slot '${slot.id}' accepts at most ${slot.maxComponents} component(s)`);
      }
      if (placement.action !== void 0 && !component.actions.includes(placement.action)) {
        errors.push(`component '${component.id}' may not bind action '${placement.action}'`);
      }
    }
    for (const [token, value] of Object.entries(manifest.theme)) {
      if (!release.themeTokens.includes(token)) {
        errors.push(`unknown theme token '${token}'`);
        continue;
      }
      if (unsafeThemeValue.test(value)) {
        errors.push(`theme token '${token}' has an unsafe value`);
      }
    }
    return errors;
  }
  function diffDynamicUiManifests(base, next) {
    const layout = [];
    const widgets = [];
    const theme = [];
    const actions = [];
    const baseByComponent = new Map(base.placements.map((placement) => [placement.component, placement]));
    const nextByComponent = new Map(next.placements.map((placement) => [placement.component, placement]));
    for (const [component, placement] of nextByComponent) {
      const previous = baseByComponent.get(component);
      if (previous === void 0) {
        widgets.push(`added ${component} to ${placement.slot}`);
        if (placement.action !== void 0) actions.push(`bound ${component}.${placement.action}`);
        continue;
      }
      if (previous.slot !== placement.slot) {
        layout.push(`moved ${component} ${previous.slot} \u2192 ${placement.slot}`);
      }
      if (previous.action !== placement.action) {
        actions.push(previous.action === void 0 ? `bound ${component}.${placement.action ?? ""}` : `${placement.action === void 0 ? `unbound ${component}.${previous.action}` : `rebound ${component}.${previous.action} \u2192 ${placement.action}`}`);
      }
    }
    for (const [component, placement] of baseByComponent) {
      if (!nextByComponent.has(component)) widgets.push(`removed ${component} from ${placement.slot}`);
    }
    const tokens = /* @__PURE__ */ new Set([...Object.keys(base.theme), ...Object.keys(next.theme)]);
    for (const token of [...tokens].sort()) {
      const before = base.theme[token];
      const after = next.theme[token];
      if (before === after) continue;
      if (before === void 0) theme.push(`${token}: unset \u2192 ${after ?? ""}`);
      else if (after === void 0) theme.push(`${token}: ${before} \u2192 unset`);
      else theme.push(`${token}: ${before} \u2192 ${after}`);
    }
    if (base.scope !== next.scope) layout.push(`scope ${base.scope} \u2192 ${next.scope}`);
    return {
      layout,
      widgets,
      theme,
      actions,
      empty: layout.length === 0 && widgets.length === 0 && theme.length === 0 && actions.length === 0
    };
  }
  function isDynamicUiManifest(value) {
    return (0, import_integration_core2.isRecord)(value) && typeof value.abiVersion === "number" && isDynamicUiScope(value.scope) && Array.isArray(value.placements) && value.placements.every(isDynamicUiPlacement) && (0, import_integration_core2.isRecord)(value.theme) && Object.values(value.theme).every((token) => __epochIsString(token));
  }
  function isDynamicUiScope(value) {
    return value === "personal" || value === "project" || value === "session";
  }
  function isDynamicUiPlacement(value) {
    return (0, import_integration_core2.isRecord)(value) && typeof value.slot === "string" && typeof value.component === "string";
  }

  // packages/Epoch.Community.Runtime/src/workspace.ts
  var import_integration_core3 = __toESM(require_dist2());
  var TRUNK_VIEW = "main";
  var VIEW_PREFIX = "ui/views/";
  var ACTIVE_ENTITY = "ui/refs/active";
  var SAFE_MODE_ENTITY = "ui/refs/safe-mode";
  var LAST_KNOWN_GOOD_ENTITY = "ui/refs/last-known-good";
  function viewRef(name, kind) {
    return kind === "trunk" ? `refs/ui/views/${name}` : `refs/ui/proposals/${name}`;
  }
  function createBrowserEpochWorkspace(options) {
    const harness = options.harness;
    const epoch = (0, import_integration_core3.createBrowserEpoch)({
      namespace: options.namespace,
      author: options.author,
      ...!(options.storage === void 0) && { storage: options.storage }
    });
    const id = identifier("ws", { namespace: options.namespace, harness: harness.releaseId });
    const initialManifest = options.initialManifest ?? harness.safeModeManifest;
    ensureTrunk();
    function ensureTrunk() {
      if (epoch.readOptionalTrackedEntity(viewEntity(TRUNK_VIEW)) !== void 0) return;
      const created = appendRevision(TRUNK_VIEW, {
        manifest: initialManifest,
        provenance: { kind: "created" },
        kind: "trunk"
      }, `created view ${TRUNK_VIEW}`);
      setActive(TRUNK_VIEW);
      if (validate(initialManifest).length === 0) {
        promoteLastKnownGood(TRUNK_VIEW, created.revisionIds[0] ?? 1);
      }
    }
    function promoteLastKnownGood(view, revision2) {
      return epoch.trackChange({
        entity: LAST_KNOWN_GOOD_ENTITY,
        surface: "gen-ui",
        source: "community-runtime",
        summary: `promoted ${view}@${revision2} to last-known-good`,
        payload: { view, revision: revision2 }
      }).event.id;
    }
    function viewEntity(name) {
      return `${VIEW_PREFIX}${name}`;
    }
    function appendRevision(name, record, summary) {
      const result = epoch.trackChange({
        entity: viewEntity(name),
        surface: "gen-ui",
        source: "community-runtime",
        summary,
        payload: record,
        metadata: {
          view: name,
          ref: viewRef(name, record.kind),
          scope: record.manifest.scope,
          harnessRelease: harness.releaseId,
          manifestDigest: digestOf(record.manifest)
        }
      });
      return {
        data: summarize(name, record, result.revision, result.event.id),
        eventIds: [result.event.id],
        revisionIds: [result.revision],
        ref: viewRef(name, record.kind),
        validationErrors: record.provenance.validationErrors ?? []
      };
    }
    function summarize(name, record, revision2, headEventId) {
      const base = record.provenance.baseView === void 0 || record.provenance.baseRevision === void 0 ? void 0 : { view: record.provenance.baseView, revision: record.provenance.baseRevision };
      return {
        name,
        ref: viewRef(name, record.kind),
        kind: record.kind,
        scope: record.manifest.scope,
        revision: revision2,
        headEventId,
        valid: validate(record.manifest).length === 0,
        ...!(base === void 0) && { base }
      };
    }
    function readRecord(name) {
      const tracked = epoch.readOptionalTrackedEntity(viewEntity(name));
      if (tracked === void 0) throw new Error(`Epoch view '${name}' does not exist.`);
      if (!isUiRevisionRecord(tracked.payload)) throw new Error(`Epoch view '${name}' has an unreadable head revision.`);
      return tracked.payload;
    }
    function head(name) {
      return readRecord(name);
    }
    function history(name) {
      return epoch.versionLedger(viewEntity(name));
    }
    function revision(name, target) {
      const event = epoch.repository.history().find((candidate) => {
        if (candidate.entity !== viewEntity(name)) return false;
        const payload2 = candidate.payload;
        return payload2.revision === target;
      });
      if (event === void 0) throw new Error(`Epoch view '${name}' has no revision ${target}.`);
      const payload = event.payload.payload;
      if (!isUiRevisionRecord(payload)) throw new Error(`Epoch view '${name}' revision ${target} is unreadable.`);
      return payload;
    }
    function listViews() {
      const names = /* @__PURE__ */ new Set();
      for (const event of epoch.repository.history()) {
        if (event.entity.startsWith(VIEW_PREFIX)) names.add(event.entity.slice(VIEW_PREFIX.length));
      }
      return [...names].sort().map((name) => getView(name));
    }
    function getView(name) {
      const record = readRecord(name);
      const ledger = history(name);
      const latest = ledger.at(-1);
      return summarize(name, record, latest?.revision ?? 1, latest?.eventId ?? "");
    }
    function activeView() {
      const tracked = epoch.readOptionalTrackedEntity(ACTIVE_ENTITY);
      return tracked === void 0 ? TRUNK_VIEW : tracked.payload.view;
    }
    function setActive(name) {
      return epoch.trackChange({
        entity: ACTIVE_ENTITY,
        surface: "gen-ui",
        source: "community-runtime",
        summary: `checked out ${name}`,
        payload: { view: name }
      }).event.id;
    }
    function safeMode() {
      const tracked = epoch.readOptionalTrackedEntity(SAFE_MODE_ENTITY);
      return tracked !== void 0 && tracked.payload.active;
    }
    function lastKnownGood() {
      const tracked = epoch.readOptionalTrackedEntity(LAST_KNOWN_GOOD_ENTITY);
      return tracked?.payload;
    }
    function validate(manifest) {
      return validateDynamicUiManifest(manifest, harness);
    }
    function createView(input) {
      const name = requireViewName(input.name);
      if (epoch.readOptionalTrackedEntity(viewEntity(name)) !== void 0) {
        throw new Error(`Epoch view '${name}' already exists.`);
      }
      const from = input.from ?? activeView();
      const source = readRecord(from);
      const baseRevision = history(from).at(-1)?.revision ?? 1;
      const manifest = input.scope === void 0 ? source.manifest : { ...source.manifest, scope: input.scope };
      return appendRevision(name, {
        manifest,
        kind: "proposal",
        provenance: { kind: "created", baseView: from, baseRevision }
      }, `created proposal view ${name} from ${from}@${baseRevision}`);
    }
    function checkout(name) {
      const view = getView(name);
      const eventId = setActive(name);
      return { data: view, eventIds: [eventId], revisionIds: [view.revision], ref: view.ref, validationErrors: [] };
    }
    function propose(input) {
      if (!isDynamicUiManifest(input.manifest)) {
        throw new Error("A UI proposal requires a dynamic UI manifest.");
      }
      const name = requireViewName(input.view);
      const existing = epoch.readOptionalTrackedEntity(viewEntity(name));
      const baseRevision = history(name).at(-1)?.revision;
      const errors = validate(input.manifest);
      const provenance = {
        kind: "proposed",
        ...!(existing === void 0) && { baseView: name },
        ...!(baseRevision === void 0) && { baseRevision },
        ...!(input.prompt === void 0) && { promptDigest: digestOf(input.prompt) },
        ...input.prompt !== void 0 && input.retainPrompt === true && { prompt: input.prompt },
        ...!(input.model === void 0) && { model: input.model },
        ...!(errors.length === 0) && { validationErrors: errors }
      };
      return appendRevision(name, {
        manifest: input.manifest,
        kind: existing === void 0 ? "proposal" : existing.payload.kind,
        provenance
      }, `proposed UI revision for ${name}`);
    }
    function diff(from, into) {
      const target = into ?? TRUNK_VIEW;
      return diffDynamicUiManifests(readRecord(target).manifest, readRecord(from).manifest);
    }
    function merge(input) {
      const into = input.into ?? TRUNK_VIEW;
      if (input.from === into) throw new Error("A view cannot be merged into itself.");
      const source = readRecord(input.from);
      const errors = validate(source.manifest);
      if (errors.length > 0) {
        throw new Error(`Epoch view '${input.from}' fails harness validation: ${errors.join("; ")}`);
      }
      const target = readRecord(into);
      const sourceRevision = history(input.from).at(-1)?.revision ?? 1;
      const mutation = appendRevision(into, {
        manifest: source.manifest,
        kind: target.kind,
        provenance: {
          kind: "merged",
          mergedFrom: input.from,
          mergedFromRevision: sourceRevision,
          baseView: into,
          baseRevision: history(into).at(-1)?.revision ?? 1
        }
      }, `merged ${input.from}@${sourceRevision} into ${into}`);
      const promotion = promoteLastKnownGood(into, mutation.revisionIds[0] ?? 1);
      return { ...mutation, eventIds: [...mutation.eventIds, promotion] };
    }
    function revert(input) {
      const target = revision(input.view, input.toRevision);
      const current = readRecord(input.view);
      return appendRevision(input.view, {
        manifest: target.manifest,
        kind: current.kind,
        provenance: {
          kind: "reverted",
          revertOf: input.toRevision,
          baseView: input.view,
          baseRevision: history(input.view).at(-1)?.revision ?? 1
        }
      }, `reverted ${input.view} to revision ${input.toRevision}`);
    }
    function restoreLastKnownGood() {
      const known = lastKnownGood();
      if (known === void 0) throw new Error("This workspace has no last-known-good UI revision yet.");
      return revert({ view: known.view, toRevision: known.revision });
    }
    function setSafeMode(active) {
      const result = epoch.trackChange({
        entity: SAFE_MODE_ENTITY,
        surface: "gen-ui",
        source: "community-runtime",
        summary: active ? "entered safe mode" : "left safe mode",
        payload: { active }
      });
      return {
        data: { safeMode: active },
        eventIds: [result.event.id],
        revisionIds: [result.revision],
        ref: "refs/ui/safe-mode",
        validationErrors: []
      };
    }
    function materialize(name) {
      if (!verifyStaticHarnessRelease(harness)) {
        return { manifest: harness.safeModeManifest, safeMode: true, reason: "installed harness release failed digest verification" };
      }
      if (safeMode()) {
        return { manifest: harness.safeModeManifest, safeMode: true, reason: "safe mode is active" };
      }
      const view = name ?? activeView();
      const record = readRecord(view);
      const errors = validate(record.manifest);
      if (errors.length > 0) {
        return { manifest: harness.safeModeManifest, safeMode: true, reason: `head revision of '${view}' fails validation: ${errors.join("; ")}` };
      }
      return { manifest: record.manifest, safeMode: false };
    }
    function status() {
      const views = listViews();
      const proposals = views.filter((view) => view.kind === "proposal");
      const rendered = materialize();
      const known = lastKnownGood();
      return {
        workspaceId: id,
        actor: options.author,
        harnessRelease: harness.releaseId,
        harnessVerified: verifyStaticHarnessRelease(harness),
        activeView: activeView(),
        views: views.length,
        proposals: proposals.length,
        events: epoch.repository.history().length,
        safeMode: rendered.safeMode,
        state: rendered.safeMode && !safeMode() ? "unrenderable" : proposals.length > 0 ? "proposed" : "clean",
        ...!(known === void 0) && { lastKnownGood: known }
      };
    }
    return {
      id,
      actor: options.author,
      epoch,
      harness,
      status,
      listViews,
      getView,
      head,
      history,
      revision,
      activeView,
      createView,
      checkout,
      propose,
      diff,
      merge,
      revert,
      restoreLastKnownGood,
      setSafeMode,
      materialize,
      validate,
      subscribe: epoch.subscribe
    };
  }
  function requireViewName(name) {
    const trimmed = name.trim();
    if (trimmed.length === 0) throw new Error("An Epoch view name is required.");
    if (!/^[a-z0-9][a-z0-9-]*$/u.test(trimmed)) {
      throw new Error(`Epoch view name '${name}' must be lowercase letters, digits, and dashes.`);
    }
    return trimmed;
  }
  function isUiRevisionRecord(value) {
    return (0, import_integration_core3.isRecord)(value) && isDynamicUiManifest(value.manifest) && (0, import_integration_core3.isRecord)(value.provenance) && (value.kind === "trunk" || value.kind === "proposal");
  }

  // packages/Epoch.Community.Runtime/src/projects.ts
  var import_integration_core4 = __toESM(require_dist2());
  var DEFAULT_PROJECT_SLUG = ".epoch";
  var PROJECT_PREFIX = "projects/";
  function projectEntity(slug) {
    return `${PROJECT_PREFIX}${slug}`;
  }
  function readProject(epoch, slug) {
    const tracked = epoch.readOptionalTrackedEntity(projectEntity(slug));
    return tracked !== void 0 && isProjectRecord(tracked.payload) ? tracked.payload : void 0;
  }
  function listProjects(epoch) {
    const slugs = /* @__PURE__ */ new Set();
    for (const event of epoch.repository.history()) {
      if (event.entity.startsWith(PROJECT_PREFIX)) slugs.add(event.entity.slice(PROJECT_PREFIX.length));
    }
    return [...slugs].sort().flatMap((slug) => {
      const record = readProject(epoch, slug);
      if (record === void 0) return [];
      const latest = epoch.versionLedger(projectEntity(slug)).at(-1);
      return [{
        ...record,
        revision: latest?.revision ?? 1,
        eventId: latest?.eventId ?? "",
        created: false
      }];
    });
  }
  function ensureProject(epoch, input = {}) {
    const slug = input.slug ?? DEFAULT_PROJECT_SLUG;
    const existing = readProject(epoch, slug);
    if (existing !== void 0) {
      const latest = epoch.versionLedger(projectEntity(slug)).at(-1);
      return { ...existing, revision: latest?.revision ?? 1, eventId: latest?.eventId ?? "", created: false };
    }
    const record = {
      slug,
      title: input.title ?? (slug === DEFAULT_PROJECT_SLUG ? "Your Epoch project" : slug),
      kind: slug === DEFAULT_PROJECT_SLUG ? "default" : "project",
      uiView: input.uiView ?? TRUNK_VIEW,
      ...input.description === void 0 ? slug === DEFAULT_PROJECT_SLUG ? { description: "Holds the interface this browser renders, with the same history as any other project." } : {} : { description: input.description }
    };
    const result = epoch.trackChange({
      entity: projectEntity(slug),
      surface: "gen-ui",
      source: "community-runtime",
      summary: `created project ${slug}`,
      payload: record,
      metadata: { project: slug, uiView: record.uiView }
    });
    return { ...record, revision: result.revision, eventId: result.event.id, created: true };
  }
  function isProjectRecord(value) {
    return (0, import_integration_core4.isRecord)(value) && typeof value.slug === "string" && typeof value.title === "string" && typeof value.uiView === "string" && (value.kind === "default" || value.kind === "project");
  }

  // packages/Epoch.Community.Runtime/src/feeds.ts
  var import_integration_core5 = __toESM(require_dist2());
  function __epochIsString2(value) {
    return typeof value === "string";
  }
  function __epochIsNumber(value) {
    return typeof value === "number";
  }
  var FEED_PREFIX = "feeds/";
  function feedEntity(feed) {
    return `${FEED_PREFIX}${feed}`;
  }
  function appendSocialRevision(epoch, input) {
    const feed = requireText(input.feed, "feed");
    const body = requireText(input.body, "body");
    const author = input.author ?? epoch.author;
    const existing = input.changeId === void 0 ? void 0 : revisionsOf(epoch, feed).filter((entry) => entry.changeId === input.changeId);
    if (input.changeId !== void 0 && (existing === void 0 || existing.length === 0)) {
      throw new Error(`No social record ${input.changeId} in feed '${feed}'.`);
    }
    const previous = existing?.at(-1);
    const changeId = previous?.changeId ?? identifier("chg", { feed, kind: input.kind, body, author, opened: true });
    const revision = (previous?.revision ?? 0) + 1;
    const record = {
      changeId,
      revisionId: identifier("rev", { changeId, revision, body, author }),
      feed,
      kind: input.kind,
      body,
      author,
      revision,
      ...!(input.subject === void 0) && { subject: input.subject },
      ...!(previous === void 0) && { editOf: previous.revisionId },
      ...!(input.links === void 0) && { links: input.links }
    };
    const result = epoch.trackChange({
      entity: feedEntity(feed),
      surface: "social",
      source: "community-runtime",
      summary: previous === void 0 ? `opened ${input.kind} ${changeId} in ${feed}` : `revised ${input.kind} ${changeId} in ${feed}`,
      payload: record,
      metadata: {
        feed,
        changeId,
        revisionId: record.revisionId,
        bodyDigest: digestOf(body)
      }
    });
    const revisionIds = [...(existing ?? []).map((entry) => entry.revisionId), record.revisionId];
    return {
      ...record,
      eventId: result.event.id,
      revisionIds,
      edited: revisionIds.length > 1
    };
  }
  function revisionsOf(epoch, feed) {
    return epoch.repository.history().filter((event) => event.entity === feedEntity(feed)).map((event) => event.payload.payload).filter((payload) => isSocialRevision(payload));
  }
  function recordsOf(epoch, feed) {
    const byChange = /* @__PURE__ */ new Map();
    for (const revision of revisionsOf(epoch, feed)) {
      const line = byChange.get(revision.changeId) ?? [];
      line.push(revision);
      byChange.set(revision.changeId, line);
    }
    return [...byChange.values()].map((line) => {
      const head = line[line.length - 1];
      return {
        ...head,
        eventId: "",
        revisionIds: line.map((entry) => entry.revisionId),
        edited: line.length > 1
      };
    });
  }
  function historyOf(epoch, feed, changeId) {
    return revisionsOf(epoch, feed).filter((revision) => revision.changeId === changeId);
  }
  function listFeeds(epoch) {
    const feeds = /* @__PURE__ */ new Set();
    for (const event of epoch.repository.history()) {
      if (event.entity.startsWith(FEED_PREFIX)) feeds.add(event.entity.slice(FEED_PREFIX.length));
    }
    return [...feeds].sort();
  }
  function isSocialRevision(value) {
    return (0, import_integration_core5.isRecord)(value) && __epochIsString2(value.changeId) && __epochIsString2(value.revisionId) && __epochIsString2(value.feed) && __epochIsString2(value.body) && __epochIsNumber(value.revision);
  }
  function requireText(value, label) {
    const trimmed = String(value ?? "").trim();
    if (trimmed.length === 0) throw new Error(`A social record ${label} is required.`);
    return trimmed;
  }

  // packages/Epoch.Community.Runtime/src/storage.ts
  var DEFAULT_DATABASE = "epoch-community";
  var DEFAULT_STORE = "workspace";
  var SCHEMA_VERSION = 1;
  async function openDurableStorage(options) {
    const schemaVersion = options.schemaVersion ?? SCHEMA_VERSION;
    const prefix = `${options.namespace}:`;
    const factory = options.indexedDB ?? globalThis.indexedDB;
    const values = /* @__PURE__ */ new Map();
    let database;
    let pending = 0;
    let failure;
    let settled = Promise.resolve();
    if (factory !== void 0) {
      try {
        database = await openDatabase(
          factory,
          options.databaseName ?? DEFAULT_DATABASE,
          options.storeName ?? DEFAULT_STORE,
          schemaVersion
        );
        for (const [key, value] of await readAll(database, options.storeName ?? DEFAULT_STORE)) {
          if (key.startsWith(prefix)) values.set(key, value);
        }
      } catch (error) {
        failure = message(error);
        database = void 0;
      }
    }
    let migrated = 0;
    if (values.size === 0 && options.migrateFrom !== void 0) {
      for (let index = 0; index < options.migrateFrom.length; index += 1) {
        const key = options.migrateFrom.key(index);
        if (key === null || !key.startsWith(prefix)) continue;
        const value = options.migrateFrom.getItem(key);
        if (value === null) continue;
        values.set(key, value);
        migrated += 1;
      }
      for (const [key, value] of values) queue(key, value);
    }
    function queue(key, value) {
      if (database === void 0) return;
      pending += 1;
      settled = settled.then(() => write(database, options.storeName ?? DEFAULT_STORE, key, value)).then(() => {
        pending -= 1;
      }, (error) => {
        pending -= 1;
        failure = message(error);
      });
    }
    return {
      kind: database === void 0 ? "memory" : "indexeddb",
      schemaVersion,
      migrated,
      get length() {
        return values.size;
      },
      key: (index) => [...values.keys()][index] ?? null,
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
        queue(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
        queue(key, null);
      },
      pendingWrites: () => pending,
      lastError: () => failure,
      flush: async () => {
        await settled;
      },
      snapshot: () => Object.fromEntries(values),
      restore: async (entries) => {
        for (const key of [...values.keys()]) {
          values.delete(key);
          queue(key, null);
        }
        for (const [key, value] of Object.entries(entries)) {
          values.set(key, value);
          queue(key, value);
        }
        await settled;
      },
      close: () => {
        database?.close();
        database = void 0;
      }
    };
  }
  function openDatabase(factory, databaseName, storeName, version) {
    return new Promise((resolve, reject) => {
      const request = factory.open(databaseName, version);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB refused to open"));
      request.onblocked = () => reject(new Error("IndexedDB open is blocked by another tab"));
    });
  }
  function readAll(database, storeName) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const keys = store.getAllKeys();
      const values = store.getAll();
      transaction.oncomplete = () => {
        const pairs = keys.result.map((key, index) => [String(key), String(values.result[index])]);
        resolve(pairs);
      };
      transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB read failed"));
    });
  }
  function write(database, storeName, key, value) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      if (value === null) store.delete(key);
      else store.put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB write failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB write aborted"));
    });
  }
  function message(error) {
    return error instanceof Error ? error.message : String(error);
  }

  // packages/Epoch.Community.Runtime/src/identity.ts
  function __epochIsString3(value) {
    return typeof value === "string";
  }
  var ALGORITHM = { name: "ECDSA", namedCurve: "P-256" };
  async function resolveBrowserIdentity(options) {
    const key = `${options.namespace}:identity`;
    const stored = readStored(options.storage.getItem(key));
    if (stored !== void 0) {
      return { actor: stored.actor, kind: "device", publicKey: stored.publicKey, created: false };
    }
    const subtle = (options.crypto ?? globalThis.crypto)?.subtle;
    if (subtle === void 0) {
      return { actor: "did:epoch:anonymous", kind: "ephemeral", created: false };
    }
    try {
      const pair = await subtle.generateKey(ALGORITHM, false, ["sign", "verify"]);
      const publicKey = await subtle.exportKey("jwk", pair.publicKey);
      const actor = `did:epoch:${digestOf(publicKey)}`;
      const record = { version: 1, actor, publicKey };
      options.storage.setItem(key, JSON.stringify(record));
      return { actor, kind: "device", publicKey, created: true };
    } catch {
      return { actor: "did:epoch:anonymous", kind: "ephemeral", created: false };
    }
  }
  function readStored(raw) {
    if (raw === null) return void 0;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.version !== 1 || !__epochIsString3(parsed.actor) || parsed.publicKey === void 0) {
        return void 0;
      }
      return { version: 1, actor: parsed.actor, publicKey: parsed.publicKey };
    } catch {
      return void 0;
    }
  }

  // packages/Epoch.Community.Runtime/src/sync.ts
  var import_integration_core6 = __toESM(require_dist2());
  function exportWorkspaceBundle(epoch, workspaceId, namespace) {
    const events = epoch.repository.history().map((event) => ({
      id: event.id,
      entity: event.entity,
      author: event.author,
      lamport: event.lamport,
      payload: event.payload
    }));
    return {
      kind: "epoch-workspace-bundle",
      version: 1,
      workspaceId,
      namespace,
      events,
      digest: digestOf(events)
    };
  }
  function importWorkspaceBundle(epoch, bundle) {
    if (!isBundle(bundle)) throw new Error("That is not an Epoch workspace bundle.");
    if (digestOf(bundle.events) !== bundle.digest) {
      throw new Error("Bundle digest does not match its events; refusing to import.");
    }
    const known = new Set(epoch.repository.history().map((event) => event.id));
    let applied = 0;
    let skipped = 0;
    const rejected = [];
    for (const event of bundle.events) {
      if (known.has(event.id)) {
        skipped += 1;
        continue;
      }
      if (!isBundledEvent(event)) {
        rejected.push(`${String(event.id ?? "unknown")}: not an event`);
        continue;
      }
      epoch.repository.append(event.entity, event.payload);
      applied += 1;
    }
    return { applied, skipped, rejected, events: epoch.repository.history().length };
  }
  function isBundle(value) {
    return (0, import_integration_core6.isRecord)(value) && value.kind === "epoch-workspace-bundle" && value.version === 1 && typeof value.digest === "string" && Array.isArray(value.events);
  }
  function isBundledEvent(value) {
    return (0, import_integration_core6.isRecord)(value) && typeof value.id === "string" && typeof value.entity === "string" && value.entity.trim().length > 0 && (0, import_integration_core6.isRecord)(value.payload);
  }

  // packages/Epoch.Community.Runtime/src/commands.ts
  function __epochIsString4(value) {
    return typeof value === "string";
  }
  function __epochIsNumber2(value) {
    return typeof value === "number";
  }
  function createCommunityCommandBus(options) {
    const workspace = options.workspace;
    const handlers = /* @__PURE__ */ new Map();
    let sequence = 0;
    register({
      kind: "workspace.status",
      summary: "Report workspace identity, active view, proposal count, and recovery state.",
      capability: "workspace.read",
      readOnly: true,
      requiresConfirmation: false,
      untrustedContent: false,
      inputSchema: emptySchema()
    }, () => ({ data: workspace.status() }));
    register({
      kind: "workspace.verify",
      summary: "Verify the installed static harness release against its content digest.",
      capability: "workspace.read",
      readOnly: true,
      requiresConfirmation: false,
      untrustedContent: false,
      inputSchema: emptySchema()
    }, () => {
      const verified = verifyStaticHarnessRelease(workspace.harness);
      return {
        data: { harnessRelease: workspace.harness.releaseId, verified },
        validation: validationReceipt(workspace.harness.releaseId, verified ? [] : ["harness release digest mismatch"])
      };
    });
    register({
      kind: "view.list",
      summary: "List named views and proposals in this workspace.",
      capability: "workspace.read",
      readOnly: true,
      requiresConfirmation: false,
      untrustedContent: false,
      inputSchema: emptySchema()
    }, () => ({ data: workspace.listViews() }));
    register({
      kind: "history.list",
      summary: "List the revision ledger for a view.",
      capability: "workspace.read",
      readOnly: true,
      requiresConfirmation: false,
      untrustedContent: false,
      inputSchema: schema({ view: stringProperty("View name; defaults to the active view.") })
    }, (input) => {
      const view = optionalString(input, "view") ?? workspace.activeView();
      return { data: workspace.history(view), baseRef: workspace.getView(view).ref };
    });
    register({
      kind: "change.show",
      summary: "Show one revision of a view with its provenance.",
      capability: "workspace.read",
      readOnly: true,
      requiresConfirmation: false,
      untrustedContent: true,
      inputSchema: schema(
        { view: stringProperty("View name."), revision: numberProperty("Revision number.") },
        ["view", "revision"]
      )
    }, (input) => {
      const view = requiredString(input, "view");
      const revision = requiredNumber(input, "revision");
      return { data: workspace.revision(view, revision), baseRef: workspace.getView(view).ref };
    });
    register({
      kind: "ui.getManifest",
      summary: "Return the manifest the harness would render, and whether safe mode is engaged.",
      capability: "workspace.read",
      readOnly: true,
      requiresConfirmation: false,
      untrustedContent: false,
      inputSchema: schema({ view: stringProperty("View name; defaults to the active view.") })
    }, (input) => {
      const view = optionalString(input, "view");
      return { data: workspace.materialize(view) };
    });
    register({
      kind: "ui.semanticDiff",
      summary: "Explain what a view changes about layout, widgets, theme tokens, and action bindings.",
      capability: "workspace.read",
      readOnly: true,
      requiresConfirmation: false,
      untrustedContent: false,
      inputSchema: schema(
        { from: stringProperty("Source view."), into: stringProperty("Target view; defaults to the trunk view.") },
        ["from"]
      )
    }, (input) => {
      const from = requiredString(input, "from");
      const into = optionalString(input, "into");
      return { data: workspace.diff(from, into), proposalRef: workspace.getView(from).ref };
    });
    register({
      kind: "ui.validate",
      summary: "Validate a view head against the installed harness slot and component allowlist.",
      capability: "workspace.read",
      readOnly: true,
      requiresConfirmation: false,
      untrustedContent: false,
      inputSchema: schema({ view: stringProperty("View name.") }, ["view"])
    }, (input) => {
      const view = requiredString(input, "view");
      const errors = workspace.validate(workspace.head(view).manifest);
      return {
        data: { view, valid: errors.length === 0, errors },
        validation: validationReceipt(view, errors)
      };
    });
    register({
      kind: "project.list",
      summary: "List projects in this workspace, including the default .epoch project.",
      capability: "workspace.read",
      readOnly: true,
      requiresConfirmation: false,
      untrustedContent: false,
      inputSchema: emptySchema()
    }, () => ({ data: listProjects(workspace.epoch) }));
    register({
      kind: "project.ensureDefault",
      summary: "Open the default .epoch project, creating it on first boot. Idempotent.",
      capability: "workspace.write",
      readOnly: false,
      requiresConfirmation: false,
      untrustedContent: false,
      inputSchema: schema({
        slug: stringProperty(`Project slug; defaults to ${DEFAULT_PROJECT_SLUG}.`),
        title: stringProperty("Human-readable project title.")
      })
    }, (input) => {
      const project = ensureProject(workspace.epoch, {
        ...!(optionalString(input, "slug") === void 0) && { slug: requiredString(input, "slug") },
        ...!(optionalString(input, "title") === void 0) && { title: requiredString(input, "title") }
      });
      return {
        data: project,
        ...project.created && { eventIds: [project.eventId], revisionIds: [project.revision] },
        baseRef: workspace.getView(project.uiView).ref
      };
    });
    register({
      kind: "feed.list",
      summary: "List social feeds in this workspace.",
      capability: "workspace.read",
      readOnly: true,
      requiresConfirmation: false,
      untrustedContent: false,
      inputSchema: emptySchema()
    }, () => ({ data: listFeeds(workspace.epoch) }));
    register({
      kind: "feed.read",
      summary: "Read the current state of every record in a feed, with its native change and revision ids.",
      capability: "workspace.read",
      readOnly: true,
      requiresConfirmation: false,
      untrustedContent: true,
      inputSchema: schema({ feed: stringProperty("Feed name.") }, ["feed"])
    }, (input) => ({ data: recordsOf(workspace.epoch, requiredString(input, "feed")) }));
    register({
      kind: "feed.history",
      summary: "Read every revision of one social record, oldest first.",
      capability: "workspace.read",
      readOnly: true,
      requiresConfirmation: false,
      untrustedContent: true,
      inputSchema: schema(
        { feed: stringProperty("Feed name."), changeId: stringProperty("Native change id.") },
        ["feed", "changeId"]
      )
    }, (input) => ({
      data: historyOf(workspace.epoch, requiredString(input, "feed"), requiredString(input, "changeId")),
      changeId: requiredString(input, "changeId")
    }));
    register({
      kind: "feed.append",
      summary: "Open a social record, or revise one. Editing appends a revision; nothing is overwritten.",
      capability: "workspace.write",
      readOnly: false,
      requiresConfirmation: false,
      untrustedContent: false,
      inputSchema: schema({
        feed: stringProperty("Feed name."),
        kind: enumProperty("Record kind.", ["post", "issue", "review", "comment", "proposal"]),
        body: stringProperty("Record body."),
        subject: stringProperty("Optional subject."),
        author: stringProperty("Author; defaults to the workspace actor."),
        changeId: stringProperty("Native change id to revise. Omit to open a new record.")
      }, ["feed", "kind", "body"])
    }, (input) => {
      const record = appendSocialRevision(workspace.epoch, {
        feed: requiredString(input, "feed"),
        kind: requiredString(input, "kind"),
        body: requiredString(input, "body"),
        ...!(optionalString(input, "subject") === void 0) && { subject: requiredString(input, "subject") },
        ...!(optionalString(input, "author") === void 0) && { author: requiredString(input, "author") },
        ...!(optionalString(input, "changeId") === void 0) && { changeId: requiredString(input, "changeId") }
      });
      return {
        data: record,
        eventIds: [record.eventId],
        revisionIds: [record.revision],
        changeId: record.changeId
      };
    });
    register({
      kind: "workspace.export",
      summary: "Export this workspace's events as a bundle another participant can import.",
      capability: "workspace.read",
      readOnly: true,
      requiresConfirmation: false,
      untrustedContent: false,
      inputSchema: emptySchema()
    }, () => ({ data: exportWorkspaceBundle(workspace.epoch, workspace.id, options.namespace) }));
    register({
      kind: "workspace.import",
      summary: "Import a workspace bundle. Events already here are skipped; nothing local is dropped.",
      capability: "workspace.write",
      readOnly: false,
      requiresConfirmation: true,
      untrustedContent: false,
      inputSchema: schema({ bundle: { type: "object", description: "An Epoch workspace bundle." } }, ["bundle"])
    }, (input) => {
      const report = importWorkspaceBundle(workspace.epoch, input.bundle);
      return {
        data: report,
        validation: validationReceipt("bundle", report.rejected)
      };
    });
    register({
      kind: "view.create",
      summary: "Create a proposal view from an existing view.",
      capability: "workspace.write",
      readOnly: false,
      requiresConfirmation: false,
      untrustedContent: false,
      inputSchema: schema(
        {
          name: stringProperty("New view name (lowercase letters, digits, dashes)."),
          from: stringProperty("Base view; defaults to the active view."),
          scope: enumProperty("Change scope for the proposal.", ["personal", "project", "session"])
        },
        ["name"]
      )
    }, (input) => fromMutation(workspace.createView({
      name: requiredString(input, "name"),
      ...!(optionalString(input, "from") === void 0) && { from: requiredString(input, "from") },
      ...!(optionalString(input, "scope") === void 0) && { scope: requiredScope(input) }
    }), "proposal"));
    register({
      kind: "view.switch",
      summary: "Make a view the active view for this workspace.",
      capability: "workspace.write",
      readOnly: false,
      requiresConfirmation: false,
      untrustedContent: false,
      inputSchema: schema({ view: stringProperty("View name.") }, ["view"])
    }, (input) => fromMutation(workspace.checkout(requiredString(input, "view")), "base"));
    register({
      kind: "ui.propose",
      summary: "Record a dynamic UI manifest as a new revision on a view.",
      capability: "ui.propose",
      readOnly: false,
      requiresConfirmation: false,
      untrustedContent: false,
      inputSchema: schema(
        {
          view: stringProperty("View to append the revision to."),
          manifest: { type: "object", description: "Dynamic UI manifest: abiVersion, scope, placements, theme." },
          prompt: stringProperty("Prompt that produced the manifest. Stored as a digest unless retainPrompt is true."),
          model: stringProperty("Model or provider identifier that generated the manifest."),
          retainPrompt: booleanProperty("Store the prompt text alongside its digest.")
        },
        ["view", "manifest"]
      )
    }, (input) => {
      const manifestValue = input.manifest;
      if (!isDynamicUiManifest(manifestValue)) {
        throw new EpochCommandError("invalid-input", "manifest must be a dynamic UI manifest");
      }
      const manifest = manifestValue;
      const mutation = workspace.propose({
        view: requiredString(input, "view"),
        manifest,
        ...!(optionalString(input, "prompt") === void 0) && { prompt: requiredString(input, "prompt") },
        ...!(optionalString(input, "model") === void 0) && { model: requiredString(input, "model") },
        ...input.retainPrompt === true && { retainPrompt: true }
      });
      return {
        ...fromMutation(mutation, "proposal"),
        validation: validationReceipt(mutation.data.ref, mutation.validationErrors)
      };
    });
    register({
      kind: "change.merge",
      summary: "Promote a validated view into its target view and advance last-known-good.",
      capability: "ui.merge",
      readOnly: false,
      requiresConfirmation: true,
      untrustedContent: false,
      inputSchema: schema(
        { from: stringProperty("Source view."), into: stringProperty("Target view; defaults to the trunk view.") },
        ["from"]
      )
    }, (input) => fromMutation(workspace.merge({
      from: requiredString(input, "from"),
      ...!(optionalString(input, "into") === void 0) && { into: requiredString(input, "into") }
    }), "base"));
    register({
      kind: "change.revert",
      summary: "Append a revision that restores an earlier manifest. History is preserved.",
      capability: "ui.merge",
      readOnly: false,
      requiresConfirmation: true,
      untrustedContent: false,
      inputSchema: schema(
        { view: stringProperty("View name."), revision: numberProperty("Revision to restore.") },
        ["view", "revision"]
      )
    }, (input) => fromMutation(workspace.revert({
      view: requiredString(input, "view"),
      toRevision: requiredNumber(input, "revision")
    }), "base"));
    register({
      kind: "ui.restoreLastKnownGood",
      summary: "Restore the last validated merged revision without discarding later history.",
      capability: "ui.recover",
      readOnly: false,
      requiresConfirmation: true,
      untrustedContent: false,
      inputSchema: emptySchema()
    }, () => fromMutation(workspace.restoreLastKnownGood(), "base"));
    register({
      kind: "ui.enterSafeMode",
      summary: "Boot the signed static harness only, ignoring the dynamic head.",
      capability: "ui.recover",
      readOnly: false,
      requiresConfirmation: false,
      untrustedContent: false,
      inputSchema: emptySchema()
    }, () => {
      const mutation = workspace.setSafeMode(true);
      return { data: mutation.data, eventIds: mutation.eventIds, revisionIds: mutation.revisionIds, baseRef: mutation.ref };
    });
    register({
      kind: "ui.leaveSafeMode",
      summary: "Leave safe mode and render the dynamic head again.",
      capability: "ui.recover",
      readOnly: false,
      requiresConfirmation: true,
      untrustedContent: false,
      inputSchema: emptySchema()
    }, () => {
      const mutation = workspace.setSafeMode(false);
      return { data: mutation.data, eventIds: mutation.eventIds, revisionIds: mutation.revisionIds, baseRef: mutation.ref };
    });
    for (const extension of options.extensions ?? []) {
      register(extension.descriptor, extension.run);
    }
    function register(descriptor2, run) {
      handlers.set(descriptor2.kind, { descriptor: descriptor2, run });
    }
    function describe(kind) {
      const handler = handlers.get(kind);
      if (handler === void 0) throw new EpochCommandError("unknown-command", `Unknown Epoch command '${kind}'.`);
      return handler.descriptor;
    }
    function granted(capability) {
      return options.policies.capabilities.includes("*") || options.policies.capabilities.includes(capability);
    }
    function needsConfirmation(descriptor2) {
      return descriptor2.requiresConfirmation || (options.policies.requireConfirmation ?? []).includes(descriptor2.kind);
    }
    async function execute(request) {
      const handler = handlers.get(request.kind);
      if (handler === void 0) {
        throw new EpochCommandError("unknown-command", `Unknown Epoch command '${request.kind}'.`);
      }
      const descriptor2 = handler.descriptor;
      const input = request.input ?? {};
      sequence += 1;
      const base = {
        kind: descriptor2.kind,
        source: request.source ?? options.defaultSource,
        actor: request.actor ?? workspace.actor,
        workspaceId: workspace.id,
        readOnly: descriptor2.readOnly,
        sequence,
        timestamp: options.now(),
        input
      };
      if (!granted(descriptor2.capability)) {
        return emit(createCommandReceipt({
          ...base,
          policy: policyReceipt("deny", descriptor2.capability, `principal lacks capability '${descriptor2.capability}'`),
          validation: skippedValidation,
          confirmation: { required: needsConfirmation(descriptor2), granted: request.confirmed === true },
          data: { refused: "capability" }
        }));
      }
      if (needsConfirmation(descriptor2) && request.confirmed !== true) {
        return emit(createCommandReceipt({
          ...base,
          policy: policyReceipt("confirm", descriptor2.capability, `'${descriptor2.kind}' requires explicit confirmation`),
          validation: skippedValidation,
          confirmation: { required: true, granted: false },
          data: { refused: "confirmation" }
        }));
      }
      const outcome = await handler.run(input, {
        actor: base.actor,
        source: base.source,
        confirmed: request.confirmed === true
      });
      return emit(createCommandReceipt({
        ...base,
        policy: policyReceipt("allow", descriptor2.capability),
        validation: outcome.validation ?? skippedValidation,
        confirmation: { required: needsConfirmation(descriptor2), granted: request.confirmed === true },
        ...!(outcome.baseRef === void 0) && { baseRef: outcome.baseRef },
        ...!(outcome.proposalRef === void 0) && { proposalRef: outcome.proposalRef },
        ...!(outcome.changeId === void 0) && { changeId: outcome.changeId },
        ...!(outcome.revisionIds === void 0) && { revisionIds: outcome.revisionIds },
        ...!(outcome.eventIds === void 0) && { eventIds: outcome.eventIds },
        data: outcome.data
      }));
    }
    function emit(receipt) {
      options.onReceipt?.(receipt);
      return receipt;
    }
    return {
      get catalog() {
        return [...handlers.values()].map((handler) => handler.descriptor);
      },
      describe,
      execute
    };
  }
  function fromMutation(mutation, ref) {
    return {
      data: mutation.data,
      eventIds: mutation.eventIds,
      revisionIds: mutation.revisionIds,
      ...ref === "base" ? { baseRef: mutation.ref } : { proposalRef: mutation.ref },
      changeId: mutation.eventIds[0] ?? ""
    };
  }
  function emptySchema() {
    return { type: "object", properties: {} };
  }
  function schema(properties, required = []) {
    return required.length === 0 ? { type: "object", properties } : { type: "object", properties, required };
  }
  function stringProperty(description) {
    return { type: "string", description };
  }
  function numberProperty(description) {
    return { type: "number", description };
  }
  function booleanProperty(description) {
    return { type: "boolean", description };
  }
  function enumProperty(description, values) {
    return { type: "string", description, enum: values };
  }
  function requiredString(input, key) {
    const value = input[key];
    if (!__epochIsString4(value) || value.trim().length === 0) {
      throw new EpochCommandError("invalid-input", `Command input '${key}' must be a non-empty string.`);
    }
    return value;
  }
  function optionalString(input, key) {
    const value = input[key];
    return __epochIsString4(value) && value.trim().length > 0 ? value : void 0;
  }
  function requiredNumber(input, key) {
    const value = input[key];
    if (!__epochIsNumber2(value) || !Number.isFinite(value)) {
      throw new EpochCommandError("invalid-input", `Command input '${key}' must be a number.`);
    }
    return value;
  }
  function requiredScope(input) {
    const value = requiredString(input, "scope");
    if (value !== "personal" && value !== "project" && value !== "session") {
      throw new EpochCommandError("invalid-input", `Unsupported change scope '${value}'.`);
    }
    return value;
  }

  // packages/Epoch.Community.Runtime/src/runtime.ts
  var readOnlyPolicies = { capabilities: ["workspace.read"] };
  function createCommunityRuntime(options) {
    const harness = options.harness ?? defaultCommunityHarness();
    const workspace = createBrowserEpochWorkspace({
      namespace: options.namespace,
      author: options.actor,
      harness,
      ...!(options.storage === void 0) && { storage: options.storage },
      ...!(options.initialManifest === void 0) && { initialManifest: options.initialManifest }
    });
    const listeners = /* @__PURE__ */ new Set();
    const commands = createCommunityCommandBus({
      workspace,
      namespace: options.namespace,
      policies: options.policies ?? readOnlyPolicies,
      defaultSource: options.defaultSource ?? "sdk",
      now: options.now ?? (() => (/* @__PURE__ */ new Date()).toISOString()),
      ...!(options.extensions === void 0) && { extensions: options.extensions },
      onReceipt: (receipt) => {
        for (const listener of listeners) listener(receipt);
      }
    });
    return {
      workspaceId: workspace.id,
      actor: workspace.actor,
      harness,
      commands,
      workspace,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      }
    };
  }
  function defaultCommunityHarness() {
    return createStaticHarnessRelease({
      abiVersion: 1,
      slots: [
        { id: "shell.primary-navigation", accepts: ["navigation"], maxComponents: 1 },
        { id: "shell.workspace-status", accepts: ["status"], maxComponents: 2 },
        { id: "board.thread-list", accepts: ["feed"], maxComponents: 1 },
        { id: "board.context-panel", accepts: ["panel", "status"], maxComponents: 3 },
        { id: "board.composer", accepts: ["composer"], maxComponents: 1 },
        { id: "board.recovery", accepts: ["recovery"], maxComponents: 1 }
      ],
      components: [
        { id: "PrimaryNav", category: "navigation", actions: ["view.switch"] },
        { id: "WorkspaceStatus", category: "status", actions: ["workspace.status", "change.show"] },
        { id: "VerificationSummary", category: "status", actions: ["workspace.verify", "change.show"] },
        { id: "ThreadList", category: "feed", actions: ["change.show"] },
        { id: "LiveActivity", category: "panel", actions: [] },
        { id: "TrendingTopics", category: "panel", actions: [] },
        { id: "Composer", category: "composer", actions: ["ui.propose"] },
        { id: "RecoveryControls", category: "recovery", actions: ["ui.restoreLastKnownGood", "ui.enterSafeMode"] }
      ],
      themeTokens: ["--density-row", "--accent", "--surface", "--text"],
      safeModeManifest: {
        abiVersion: 1,
        scope: "personal",
        placements: [
          { slot: "shell.primary-navigation", component: "PrimaryNav", action: "view.switch" },
          { slot: "shell.workspace-status", component: "WorkspaceStatus", action: "workspace.status" },
          { slot: "board.thread-list", component: "ThreadList" },
          { slot: "board.recovery", component: "RecoveryControls", action: "ui.restoreLastKnownGood" }
        ],
        theme: {}
      }
    });
  }

  // packages/Epoch.Community.Runtime/src/adapters/cli.ts
  var communityRuntimeUsage = [
    "Usage:",
    "  epoch ui status",
    "  epoch ui verify",
    "  epoch ui views",
    "  epoch ui log [VIEW]",
    "  epoch ui show VIEW REVISION",
    "  epoch ui propose VIEW --manifest JSON [--prompt TEXT] [--model ID] [--retain-prompt]",
    "  epoch ui preview [VIEW]",
    "  epoch ui diff FROM [--into VIEW]",
    "  epoch ui validate VIEW",
    "  epoch ui merge FROM [--into VIEW] --confirm",
    "  epoch ui rollback VIEW --revision N --confirm",
    "  epoch ui restore --confirm",
    "  epoch ui safe-mode on|off [--confirm]",
    "  epoch ui export [--out FILE]",
    "  epoch ui import FILE --confirm",
    "  epoch view create NAME [--from VIEW] [--scope personal|project|session]",
    "  epoch view list",
    "  epoch view switch VIEW",
    "",
    "  epoch live create --space SPACE [--view REF] [--visibility private|community|unlisted|public]",
    "                    [--path GLOB]... [--action ID]... [--delay MS]",
    "  epoch live show SESSION",
    "  epoch live list",
    "  epoch live preflight SESSION",
    "  epoch live consent SESSION --scope SCOPE...",
    "  epoch live lobby SESSION",
    "  epoch live start SESSION --confirm",
    "  epoch live pause SESSION",
    "  epoch live resume SESSION",
    "  epoch live end SESSION --confirm",
    "  epoch live seal SESSION [--completeness complete|semantic-only|media-missing|partial] --confirm",
    "  epoch live publish SESSION --action ID [--path PATH] [--args JSON]",
    "  epoch live status SESSION",
    "  epoch live checkpoint SESSION",
    "  epoch live join SESSION",
    "  epoch live request-grant SESSION --capability CAPABILITY",
    "  epoch live grant SESSION --principal ID --role cohost|collaborator|agent|observer --confirm",
    "  epoch live revoke SESSION --principal ID --confirm",
    "  epoch live lock SESSION on|off",
    "  epoch live bookmark SESSION --checkpoint ID",
    "  epoch live annotate SESSION --checkpoint ID --body TEXT [--path PATH]",
    "  epoch live fork SESSION --checkpoint ID",
    "  epoch live report SESSION --reason TEXT",
    "",
    "Add --json to print the command receipt verbatim.",
    "Live commands need a configured Community remote; without one they report",
    "that the deployment has no Live Space port rather than pretending to work."
  ].join("\n");
  async function executeCommunityRuntimeCommand(runtime, argv) {
    const json = argv.includes("--json");
    const confirmed = argv.includes("--confirm");
    const args = argv.filter((argument) => argument !== "--json" && argument !== "--confirm");
    try {
      const request = parse(args, runtime);
      const receipt = await runtime.commands.execute({ ...request, source: "cli", confirmed });
      return {
        ok: receipt.policy.decision === "allow",
        output: json ? JSON.stringify(receipt) : format(receipt),
        receipt
      };
    } catch (error) {
      if (error instanceof EpochCommandError) return { ok: false, output: `${error.code}: ${error.message}` };
      return { ok: false, output: error instanceof Error ? error.message : String(error) };
    }
  }
  function isCommunityRuntimeInvocation(argv) {
    const group = argv[0];
    return group === "ui" || group === "view" || group === "live";
  }
  function parse(args, runtime) {
    const [group, command, ...rest] = args;
    if (group === "view") return parseViewGroup(command, rest);
    if (group === "live") return parseLiveGroup(command, rest);
    if (group !== "ui") throw new EpochCommandError("invalid-command", communityRuntimeUsage);
    switch (command) {
      case "status":
        return { kind: "workspace.status", input: {} };
      case "verify":
        return { kind: "workspace.verify", input: {} };
      case "views":
        return { kind: "view.list", input: {} };
      case "log":
        return { kind: "history.list", input: positionalString(rest, 0, "view") };
      case "show":
        return {
          kind: "change.show",
          input: {
            view: requirePositional(rest, 0, "VIEW"),
            revision: Number(requirePositional(rest, 1, "REVISION"))
          }
        };
      case "preview":
        return { kind: "ui.getManifest", input: positionalString(rest, 0, "view") };
      case "diff":
        return {
          kind: "ui.semanticDiff",
          input: { from: requirePositional(rest, 0, "FROM"), ...optionValue(rest, "into", "into") }
        };
      case "validate":
        return { kind: "ui.validate", input: { view: requirePositional(rest, 0, "VIEW") } };
      case "propose":
        return parsePropose(rest, runtime);
      case "merge":
        return {
          kind: "change.merge",
          input: { from: requirePositional(rest, 0, "FROM"), ...optionValue(rest, "into", "into") }
        };
      case "rollback":
        return {
          kind: "change.revert",
          input: {
            view: requirePositional(rest, 0, "VIEW"),
            revision: Number(requireOption(rest, "revision"))
          }
        };
      case "restore":
        return { kind: "ui.restoreLastKnownGood", input: {} };
      case "export":
        return { kind: "workspace.export", input: {} };
      case "import":
        return {
          kind: "workspace.import",
          // SAFETY: readBundle JSON is validated during workspace import.
          input: { bundle: readBundle(requirePositional(rest, 0, "FILE")) }
        };
      case "safe-mode":
        return {
          kind: requirePositional(rest, 0, "on|off") === "on" ? "ui.enterSafeMode" : "ui.leaveSafeMode",
          input: {}
        };
      default:
        throw new EpochCommandError("invalid-command", communityRuntimeUsage);
    }
  }
  function parseViewGroup(command, rest) {
    switch (command) {
      case "create":
        return {
          kind: "view.create",
          input: {
            name: requirePositional(rest, 0, "NAME"),
            ...optionValue(rest, "from", "from"),
            ...optionValue(rest, "scope", "scope")
          }
        };
      case "list":
        return { kind: "view.list", input: {} };
      case "switch":
        return { kind: "view.switch", input: { view: requirePositional(rest, 0, "VIEW") } };
      default:
        throw new EpochCommandError("invalid-command", communityRuntimeUsage);
    }
  }
  function parseLiveGroup(command, rest) {
    const lifecycleKind = command === void 0 ? void 0 : liveLifecycleKind(command);
    if (lifecycleKind !== void 0) {
      return { kind: lifecycleKind, input: { sessionId: requirePositional(rest, 0, "SESSION") } };
    }
    switch (command) {
      case "create":
        return {
          kind: "live.session.create",
          input: {
            spaceId: requireOption(rest, "space"),
            policy: {
              ...optionValue(rest, "view", "presentationViewRef"),
              ...optionValue(rest, "visibility", "visibility"),
              ...optionValue(rest, "security-mode", "securityMode"),
              allowedPathPatterns: repeatedOption(rest, "path"),
              allowedActionIds: repeatedOption(rest, "action"),
              ...numberOption(rest, "delay", "publicationDelayMs")
            }
          }
        };
      case "show":
        return { kind: "live.session.show", input: { sessionId: requirePositional(rest, 0, "SESSION") } };
      case "list":
        return { kind: "live.session.list", input: {} };
      case "preflight":
        return { kind: "live.session.preflight", input: { sessionId: requirePositional(rest, 0, "SESSION") } };
      case "consent":
        return {
          kind: "live.session.consent",
          input: { sessionId: requirePositional(rest, 0, "SESSION"), scopes: repeatedOption(rest, "scope") }
        };
      case "seal":
        return {
          kind: "live.session.seal",
          input: {
            sessionId: requirePositional(rest, 0, "SESSION"),
            ...optionValue(rest, "completeness", "completeness")
          }
        };
      case "publish":
        return {
          kind: "live.presentation.publish",
          input: {
            sessionId: requirePositional(rest, 0, "SESSION"),
            actionId: requireOption(rest, "action"),
            args: jsonOption(rest, "args"),
            ...optionValue(rest, "path", "path")
          }
        };
      case "status":
        return { kind: "live.presentation.status", input: { sessionId: requirePositional(rest, 0, "SESSION") } };
      case "checkpoint":
        return { kind: "live.presentation.checkpoint", input: { sessionId: requirePositional(rest, 0, "SESSION") } };
      case "join":
        return { kind: "live.participant.join", input: { sessionId: requirePositional(rest, 0, "SESSION") } };
      case "request-grant":
        return {
          kind: "live.participant.requestGrant",
          input: { sessionId: requirePositional(rest, 0, "SESSION"), capability: requireOption(rest, "capability") }
        };
      case "grant":
        return {
          kind: "live.participant.grant",
          input: {
            sessionId: requirePositional(rest, 0, "SESSION"),
            principalId: requireOption(rest, "principal"),
            role: requireOption(rest, "role")
          }
        };
      case "revoke":
        return {
          kind: "live.participant.revoke",
          input: { sessionId: requirePositional(rest, 0, "SESSION"), principalId: requireOption(rest, "principal") }
        };
      case "lock":
        return {
          kind: "live.participant.lockJoins",
          input: {
            sessionId: requirePositional(rest, 0, "SESSION"),
            locked: requirePositional(rest, 1, "on|off") === "on"
          }
        };
      case "bookmark":
        return {
          kind: "live.presentation.bookmark",
          input: { sessionId: requirePositional(rest, 0, "SESSION"), checkpointId: requireOption(rest, "checkpoint") }
        };
      case "annotate":
        return {
          kind: "live.presentation.annotate",
          input: {
            sessionId: requirePositional(rest, 0, "SESSION"),
            checkpointId: requireOption(rest, "checkpoint"),
            body: requireOption(rest, "body"),
            ...optionValue(rest, "path", "path")
          }
        };
      case "fork":
        return {
          kind: "live.presentation.forkAt",
          input: { sessionId: requirePositional(rest, 0, "SESSION"), checkpointId: requireOption(rest, "checkpoint") }
        };
      case "report":
        return {
          kind: "live.moderation.report",
          input: { sessionId: requirePositional(rest, 0, "SESSION"), reason: requireOption(rest, "reason") }
        };
      default:
        throw new EpochCommandError("invalid-command", communityRuntimeUsage);
    }
  }
  function parsePropose(rest, runtime) {
    const view = requirePositional(rest, 0, "VIEW");
    const manifest = JSON.parse(requireOption(rest, "manifest"));
    if (!isDynamicUiManifest(manifest)) {
      throw new EpochCommandError("invalid-input", `--manifest must be a dynamic UI manifest for harness ABI ${runtime.harness.abiVersion}: { abiVersion, scope, placements, theme }.`);
    }
    return {
      kind: "ui.propose",
      input: {
        view,
        // SAFETY: isDynamicUiManifest validates the manifest before this request is built.
        manifest: JSON.parse(JSON.stringify(manifest)),
        ...optionValue(rest, "prompt", "prompt"),
        ...optionValue(rest, "model", "model"),
        ...rest.includes("--retain-prompt") && { retainPrompt: true }
      }
    };
  }
  var bundleReader;
  function setCliBundleReader(reader) {
    bundleReader = reader;
  }
  function readBundle(path) {
    if (bundleReader === void 0) {
      throw new EpochCommandError("invalid-input", "This host cannot read bundle files.");
    }
    return bundleReader(path);
  }
  function format(receipt) {
    const lines = [
      `${receipt.kind}	${receipt.commandId}	${receipt.policy.decision}`
    ];
    if (receipt.policy.decision === "confirm") {
      lines.push(`confirmation required \u2014 re-run with --confirm (${receipt.policy.reason ?? ""})`);
    } else if (receipt.policy.decision === "deny") {
      lines.push(`refused \u2014 ${receipt.policy.reason ?? "policy denied this command"}`);
    }
    if (receipt.baseRef !== void 0) lines.push(`base	${receipt.baseRef}`);
    if (receipt.proposalRef !== void 0) lines.push(`proposal	${receipt.proposalRef}`);
    if (receipt.eventIds.length > 0) lines.push(`events	${receipt.eventIds.join(",")}`);
    if (receipt.validation.state !== "skipped") {
      lines.push(`validation	${receipt.validation.state}${receipt.validation.errors.length === 0 ? "" : `	${receipt.validation.errors.join("; ")}`}`);
    }
    lines.push(JSON.stringify(receipt.data));
    return lines.join("\n");
  }
  function requirePositional(args, index, label) {
    const value = args.filter((argument) => !argument.startsWith("--"))[index];
    if (value === void 0) throw new EpochCommandError("invalid-input", `Missing ${label}.`);
    return value;
  }
  function positionalString(args, index, key) {
    const value = args.filter((argument) => !argument.startsWith("--"))[index];
    return value === void 0 ? {} : { [key]: value };
  }
  function requireOption(args, name) {
    const value = readOption(args, name);
    if (value === void 0) throw new EpochCommandError("invalid-input", `Missing required option --${name}.`);
    return value;
  }
  function optionValue(args, name, key) {
    const value = readOption(args, name);
    return value === void 0 ? {} : { [key]: value };
  }
  function repeatedOption(args, name) {
    const values = [];
    for (let index = 0; index < args.length; index += 1) {
      if (args[index] !== `--${name}`) continue;
      const value = args[index + 1];
      if (value === void 0 || value.startsWith("--")) {
        throw new EpochCommandError("invalid-input", `Option --${name} requires a value.`);
      }
      values.push(value);
    }
    return values;
  }
  var LIVE_LIFECYCLE_VERBS = {
    lobby: "live.session.openLobby",
    start: "live.session.start",
    pause: "live.session.pause",
    resume: "live.session.resume",
    end: "live.session.end"
  };
  function liveLifecycleKind(verb) {
    return Object.hasOwn(LIVE_LIFECYCLE_VERBS, verb) && isLifecycleVerb(verb) ? LIVE_LIFECYCLE_VERBS[verb] : void 0;
  }
  function isLifecycleVerb(verb) {
    return Object.hasOwn(LIVE_LIFECYCLE_VERBS, verb);
  }
  function numberOption(args, name, key) {
    const value = readOption(args, name);
    if (value === void 0) return {};
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) throw new EpochCommandError("invalid-input", `Option --${name} must be an integer.`);
    return { [key]: parsed };
  }
  function jsonOption(args, name) {
    const value = readOption(args, name);
    if (value === void 0) return {};
    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new EpochCommandError("invalid-input", `Option --${name} must be valid JSON.`);
    }
    if (!isJsonDictionary(parsed)) {
      throw new EpochCommandError("invalid-input", `Option --${name} must be a JSON object.`);
    }
    return parsed;
  }
  function isJsonDictionary(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function readOption(args, name) {
    const index = args.indexOf(`--${name}`);
    if (index === -1) return void 0;
    const value = args[index + 1];
    if (value === void 0 || value.startsWith("--")) {
      throw new EpochCommandError("invalid-input", `Option --${name} requires a value.`);
    }
    return value;
  }

  // packages/Epoch.Community.Runtime/src/adapters/webmcp.ts
  var DEFAULT_WEBMCP_EXCLUDED_KINDS = Object.freeze([
    "live.media.issueToken",
    "live.media.providerEvent"
  ]);
  function createWebMcpTools(runtime, options = {}) {
    const confirmed = new Set(options.confirmedKinds ?? []);
    const excluded = new Set(options.excludeKinds ?? DEFAULT_WEBMCP_EXCLUDED_KINDS);
    return runtime.commands.catalog.filter((descriptor2) => !excluded.has(descriptor2.kind)).map((descriptor2) => ({
      name: toolName(descriptor2.kind),
      description: descriptor2.summary,
      inputSchema: descriptor2.inputSchema,
      annotations: {
        readOnlyHint: descriptor2.readOnly,
        untrustedContentHint: descriptor2.untrustedContent
      },
      execute: async (input) => {
        const receipt = await runtime.commands.execute({
          kind: descriptor2.kind,
          input,
          source: options.source ?? "webmcp",
          confirmed: confirmed.has(descriptor2.kind)
        });
        return summarizeReceipt(receipt);
      }
    }));
  }
  async function registerWebMcpTools(context, tools, options = {}) {
    const registered = [];
    for (const tool of tools) {
      await context.registerTool(tool, options);
      registered.push(tool.name);
    }
    return registered;
  }
  function toolName(kind) {
    return `epoch_${kind.replace(/\./gu, "_").replace(/([a-z0-9])([A-Z])/gu, "$1_$2").toLowerCase()}`;
  }
  function summarizeReceipt(receipt) {
    return JSON.stringify({
      commandId: receipt.commandId,
      kind: receipt.kind,
      decision: receipt.policy.decision,
      confirmationRequired: receipt.confirmation.required && !receipt.confirmation.granted,
      validation: receipt.validation.state,
      ...!(receipt.baseRef === void 0) && { baseRef: receipt.baseRef },
      ...!(receipt.proposalRef === void 0) && { proposalRef: receipt.proposalRef },
      eventIds: receipt.eventIds,
      data: receipt.data
    });
  }
  function describeCatalog(runtime) {
    return runtime.commands.catalog;
  }

  // packages/Epoch.Community.Runtime/src/stream-policy.ts
  function __epochIsString5(value) {
    return typeof value === "string";
  }
  var STREAM_CIPHER_WIDTH = 12;
  var STREAM_CIPHER_ALPHABET = "\u2591\u2592\u2593\u2588\u2580\u2584\u25A0\u25A1\u25C6\u25C7\u203B\u2021\u2020\xA4\xA7\xF8\xE6#@%&";
  var INPUT_ACTIONS = /* @__PURE__ */ new Set([
    "compose.publish",
    "prompt.mode",
    "search.open",
    "search.localFilter",
    "context.act",
    "identity.login",
    "identity.claim"
  ]);
  var VIEW_PREFERENCE_PREFIXES = ["theme."];
  var DEFAULT_STREAM_IGNORE = [
    "**/.env",
    "**/.env.*",
    "**/*.pem",
    "**/id_rsa*",
    "**/credentials*",
    "**/secrets/**",
    "dms/**",
    "**/private/**"
  ].join("\n");
  var DEFAULT_REWRITE = [
    { name: "email", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, mode: "cipher" }
  ];
  function parseStreamIgnore(source) {
    const lines = `${DEFAULT_STREAM_IGNORE}
${source ?? ""}`.split("\n");
    const rules = [];
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      rules.push(line);
    }
    return Object.freeze(rules);
  }
  function pathIsStreamIgnored(path, rules) {
    const normalized = normalizePath(path);
    let ignored = false;
    for (const rule of rules) {
      const negated = rule.startsWith("!");
      const pattern = negated ? rule.slice(1) : rule;
      if (matchGlob(normalized, pattern)) ignored = !negated;
    }
    return ignored;
  }
  function isProtectedStreamTarget(input) {
    if (input.protectAttr === true || input.inAuthDialog === true) return true;
    if (input.inputType === "password") return true;
    if (input.autocomplete === "one-time-code" || input.autocomplete === "current-password") return true;
    const path = normalizePath(input.path ?? "");
    return pathIsStreamIgnored(path, parseStreamIgnore(void 0));
  }
  function cipherToken(sessionSalt, field, value) {
    const digest = identifier("stream", { sessionSalt, field, value });
    let out = "";
    for (let index = 0; index < STREAM_CIPHER_WIDTH; index += 1) {
      const code = digest.charCodeAt(index % digest.length) + index;
      out += STREAM_CIPHER_ALPHABET[code % STREAM_CIPHER_ALPHABET.length];
    }
    return out;
  }
  function sanitizeStreamCommand(input) {
    const envelope = input.envelope;
    if (input.protectedInput === true || input.inputMuted === true) {
      if (isInputAction(envelope.actionId) || hasTextPayload(envelope.args)) {
        return { kind: "drop", reason: "protected-input" };
      }
    }
    const rules = parseStreamIgnore(input.ignore);
    const path = envelope.path ?? "";
    if (path && pathIsStreamIgnored(path, rules)) {
      return { kind: "drop", reason: "ignored-path" };
    }
    if (path && input.spectatorCanReadPath && !input.spectatorCanReadPath(path)) {
      return { kind: "drop", reason: "not-public" };
    }
    const rewritten = rewriteArgs(envelope.args, input.rewrite, input.sessionSalt ?? "session");
    if (rewritten.dropped) return { kind: "drop", reason: "rewrite-drop" };
    return {
      kind: "emit",
      envelope: {
        t: envelope.t,
        actorId: envelope.actorId,
        actionId: envelope.actionId,
        args: rewritten.args,
        ...path && { path }
      }
    };
  }
  function isInputAction(actionId) {
    return INPUT_ACTIONS.has(actionId) || actionId.startsWith("prompt.") || actionId.startsWith("compose.");
  }
  function isSpectatorViewPreference(actionId) {
    return VIEW_PREFERENCE_PREFIXES.some((prefix) => actionId.startsWith(prefix));
  }
  function replayStreamCommand(envelope) {
    if (isSpectatorViewPreference(envelope.actionId)) {
      return { kind: "skip", reason: "view-preference" };
    }
    return { kind: "apply", envelope };
  }
  function hasTextPayload(args) {
    return __epochIsString5(args.body) || __epochIsString5(args.text) || __epochIsString5(args.value);
  }
  function rewriteArgs(args, rewriteSource, sessionSalt) {
    const rules = [...DEFAULT_REWRITE, ...parseStreamRewrite(rewriteSource)];
    const next = {};
    for (const [key, value] of Object.entries(args)) {
      if (!__epochIsString5(value)) {
        next[key] = value;
        continue;
      }
      let text = value;
      for (const rule of rules) {
        rule.pattern.lastIndex = 0;
        if (!rule.pattern.test(text)) continue;
        if (rule.mode === "drop") return { args: {}, dropped: true };
        rule.pattern.lastIndex = 0;
        text = text.replace(rule.pattern, (match) => cipherToken(sessionSalt, rule.name, match));
      }
      next[key] = text;
    }
    return { args: Object.freeze(next), dropped: false };
  }
  function parseStreamRewrite(source) {
    if (!source) return [];
    const rules = [];
    for (const raw of source.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const match = /^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*\/(.+)\/([a-z]*)\s*→\s*(cipher|drop)\s*$/u.exec(line);
      if (!match) continue;
      try {
        rules.push({
          name: match[1],
          pattern: new RegExp(match[2], match[3]),
          mode: match[4]
        });
      } catch {
      }
    }
    return rules;
  }
  function normalizePath(path) {
    return String(path ?? "").replaceAll("\\", "/").replace(/^\/+/u, "").replace(/\/+$/u, "");
  }
  function matchGlob(path, pattern) {
    const cleaned = normalizePath(pattern);
    if (cleaned.endsWith("/**")) {
      const prefix = cleaned.slice(0, -3);
      return path === prefix || path.startsWith(`${prefix}/`);
    }
    const escaped = cleaned.replaceAll("**/", "\0dbl\0").replaceAll("**", "\0all\0").replaceAll("*", "\0one\0").replaceAll(/[.+^${}()|[\]\\]/gu, "\\$&").replaceAll("\0dbl\0", "(?:.*/)?").replaceAll("\0all\0", ".*").replaceAll("\0one\0", "[^/]*");
    return new RegExp(`^${escaped}$`, "u").test(path);
  }

  // packages/Epoch.Community.Runtime/src/live/contracts.ts
  var LIFECYCLE_TRANSITIONS = {
    openLobby: { from: ["draft"], to: "lobby" },
    start: { from: ["lobby"], to: "live" },
    pause: { from: ["live"], to: "paused" },
    resume: { from: ["paused"], to: "live" },
    end: { from: ["live", "paused", "lobby"], to: "ended" },
    seal: { from: ["ended"], to: "sealed" }
  };
  function nextLiveLifecycle(current, command) {
    if (current === "sealed") {
      return { kind: "refused", reason: "sealed sessions are immutable" };
    }
    const transition = LIFECYCLE_TRANSITIONS[command];
    if (!transition.from.includes(current)) {
      return { kind: "refused", reason: `cannot ${command} from '${current}'` };
    }
    return { kind: "ok", state: transition.to };
  }
  function isLiveLifecycle(value) {
    return ["draft", "lobby", "live", "paused", "ended", "sealed"].includes(value);
  }
  function isLiveLifecycleCommand(value) {
    return ["openLobby", "start", "pause", "resume", "end", "seal"].includes(value);
  }
  var LIVE_POLICY_BOUNDS = Object.freeze({
    maxPatterns: 64,
    maxPatternLength: 256,
    maxActionIds: 128,
    maxDelayMs: 12e4,
    maxRetentionDays: 365,
    maxSpectators: 1e4,
    maxPublishers: 64,
    maxEgressDestinations: 8
  });
  function normalizeLivePublicationPolicy(input) {
    const errors = [];
    const visibilityInput = input.visibility ?? "private";
    const visibility = isLiveVisibility(visibilityInput) ? visibilityInput : void 0;
    if (visibility === void 0) errors.push(`unknown visibility '${visibilityInput}'`);
    const securityModeInput = input.securityMode ?? "semantic-only";
    const securityMode = isLiveSecurityMode(securityModeInput) ? securityModeInput : void 0;
    if (securityMode === void 0) errors.push(`unknown security mode '${securityModeInput}'`);
    const presentationViewRef = input.presentationViewRef ?? "";
    if (presentationViewRef.trim().length === 0) errors.push("presentationViewRef is required");
    const allowedPathPatterns = normalizePatternList(input.allowedPathPatterns ?? [], "allowedPathPatterns", errors);
    const deniedPathPatterns = normalizePatternList(input.deniedPathPatterns ?? [], "deniedPathPatterns", errors);
    const allowedActionIds = normalizeActionList(input.allowedActionIds ?? [], errors);
    const media = {
      audio: input.media?.audio === true,
      camera: input.media?.camera === true,
      screenShare: input.media?.screenShare === true,
      captions: normalizeCaptions(input.media?.captions, errors),
      recording: input.media?.recording === true,
      externalEgress: Object.freeze([...input.media?.externalEgress ?? []])
    };
    if (media.externalEgress.length > LIVE_POLICY_BOUNDS.maxEgressDestinations) {
      errors.push("too many external egress destinations");
    }
    for (const destination of media.externalEgress) {
      if (!destination.startsWith("egress-ref:")) {
        errors.push("external egress destinations must be opaque 'egress-ref:' references, never raw URLs");
        break;
      }
    }
    const publicationDelayMs = input.publicationDelayMs ?? 0;
    if (!isBoundedInteger(publicationDelayMs, 0, LIVE_POLICY_BOUNDS.maxDelayMs)) {
      errors.push(`publicationDelayMs must be an integer between 0 and ${LIVE_POLICY_BOUNDS.maxDelayMs}`);
    }
    const retentionMode = input.retention?.mode ?? "session-only";
    if (retentionMode !== "session-only" && retentionMode !== "bounded") {
      errors.push(`unknown retention mode '${retentionMode}'`);
    }
    const retentionDays = input.retention?.days ?? 0;
    if (!isBoundedInteger(retentionDays, 0, LIVE_POLICY_BOUNDS.maxRetentionDays)) {
      errors.push("retention days out of bounds");
    }
    const maxSpectators = input.audience?.maxSpectators ?? 100;
    const maxPublishers = input.audience?.maxPublishers ?? 4;
    if (!isBoundedInteger(maxSpectators, 0, LIVE_POLICY_BOUNDS.maxSpectators)) errors.push("maxSpectators out of bounds");
    if (!isBoundedInteger(maxPublishers, 0, LIVE_POLICY_BOUNDS.maxPublishers)) errors.push("maxPublishers out of bounds");
    if (securityMode !== void 0 && visibility !== void 0) {
      errors.push(...securityModeContradictions(securityMode, visibility, media));
    }
    const retention = retentionMode === "bounded" ? { mode: "bounded", days: retentionDays } : { mode: "session-only", days: retentionDays };
    if (errors.length > 0 || visibility === void 0 || securityMode === void 0) {
      return { kind: "invalid", errors: Object.freeze(errors) };
    }
    const policy = {
      schemaVersion: 1,
      visibility,
      securityMode,
      presentationViewRef: presentationViewRef.trim(),
      allowedPathPatterns,
      deniedPathPatterns,
      allowedActionIds,
      includeAgentReceipts: input.includeAgentReceipts === true,
      includeChecks: input.includeChecks === true,
      media,
      publicationDelayMs,
      retention,
      audience: { maxSpectators, maxPublishers, joinLocked: input.audience?.joinLocked === true }
    };
    return { kind: "valid", policy: Object.freeze(policy), digest: livePolicyDigest(policy) };
  }
  function livePolicyDigest(policy) {
    return identifier("livepol", policy);
  }
  function securityModeContradictions(mode, visibility, media) {
    const errors = [];
    const anyMedia = media.audio || media.camera || media.screenShare;
    if (mode === "semantic-only" && (anyMedia || media.recording || media.externalEgress.length > 0)) {
      errors.push("semantic-only sessions cannot enable media, recording, or egress");
    }
    if (mode === "private-e2ee" && (media.recording || media.externalEgress.length > 0)) {
      errors.push("private-e2ee refuses provider recording and egress: the provider cannot read E2EE media");
    }
    if (mode === "private-e2ee" && visibility === "public") {
      errors.push("private-e2ee sessions cannot be public");
    }
    if (mode === "public-broadcast" && visibility !== "public" && visibility !== "unlisted") {
      errors.push("public-broadcast requires public or unlisted visibility");
    }
    if (mode === "public-broadcast" && anyMedia && media.captions === "disabled") {
      errors.push("public synchronized audio/video requires live captions; enable captions or drop media");
    }
    return errors;
  }
  function classifyLivePolicyChange(before, after) {
    if (livePolicyDigest(before) === livePolicyDigest(after)) return "equal";
    const widened = policyWidens(before, after);
    const narrowed = policyWidens(after, before);
    if (widened && narrowed) return "mixed";
    return widened ? "widening" : "narrowing";
  }
  function policyWidens(before, after) {
    if (visibilityRank(after.visibility) > visibilityRank(before.visibility)) return true;
    if (!isSubset(after.allowedPathPatterns, before.allowedPathPatterns)) return true;
    if (!isSubset(after.allowedActionIds, before.allowedActionIds)) return true;
    if (!isSubset(before.deniedPathPatterns, after.deniedPathPatterns)) return true;
    if (after.publicationDelayMs < before.publicationDelayMs) return true;
    const mediaFlags = ["audio", "camera", "screenShare", "recording"];
    for (const flag of mediaFlags) {
      if (after.media[flag] === true && before.media[flag] !== true) return true;
    }
    if (!isSubset(after.media.externalEgress, before.media.externalEgress)) return true;
    if (after.includeAgentReceipts && !before.includeAgentReceipts) return true;
    if (after.includeChecks && !before.includeChecks) return true;
    return false;
  }
  function visibilityRank(visibility) {
    return ["private", "community", "unlisted", "public"].indexOf(visibility);
  }
  function isSubset(candidate, reference) {
    const set = new Set(reference);
    return candidate.every((item) => set.has(item));
  }
  function isLiveVisibility(value) {
    return ["private", "community", "unlisted", "public"].includes(value);
  }
  function isLiveSecurityMode(value) {
    return ["semantic-only", "private-e2ee", "private-recordable", "public-broadcast"].includes(value);
  }
  function isLiveConsentScope(value) {
    return ["semantic-capture", "audio", "camera", "screen-share", "captions", "recording", "external-egress"].includes(value);
  }
  function normalizeCaptions(value, errors) {
    const captions = value ?? "disabled";
    if (captions !== "required" && captions !== "enabled" && captions !== "disabled") {
      errors.push(`unknown captions state '${captions}'`);
      return "disabled";
    }
    return captions;
  }
  function normalizePatternList(patterns, label, errors) {
    if (patterns.length > LIVE_POLICY_BOUNDS.maxPatterns) {
      errors.push(`${label} exceeds ${LIVE_POLICY_BOUNDS.maxPatterns} patterns`);
      return Object.freeze([]);
    }
    const normalized = [];
    for (const raw of patterns) {
      const pattern = raw.normalize("NFKC").trim();
      if (pattern.length === 0) continue;
      if (pattern.length > LIVE_POLICY_BOUNDS.maxPatternLength) {
        errors.push(`${label} pattern too long`);
        continue;
      }
      if (pattern.includes("..")) {
        errors.push(`${label} pattern must not contain dot segments`);
        continue;
      }
      normalized.push(pattern);
    }
    return Object.freeze([...new Set(normalized)].sort());
  }
  function normalizeActionList(actionIds, errors) {
    if (actionIds.length > LIVE_POLICY_BOUNDS.maxActionIds) {
      errors.push(`allowedActionIds exceeds ${LIVE_POLICY_BOUNDS.maxActionIds} entries`);
      return Object.freeze([]);
    }
    const normalized = actionIds.map((actionId) => actionId.normalize("NFKC").trim()).filter((actionId) => actionId.length > 0);
    return Object.freeze([...new Set(normalized)].sort());
  }
  function isBoundedInteger(value, minimum, maximum) {
    return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
  }

  // packages/Epoch.Community.Runtime/src/live/publication-policy.ts
  function __epochIsString6(value) {
    return typeof value === "string";
  }
  var LIVE_SANITIZER_BOUNDS = Object.freeze({
    maxDepth: 12,
    maxObjectKeys: 128,
    maxArrayElements: 512,
    maxStringLength: 8192,
    maxCanonicalBytes: 65536,
    maxRewriteRules: 64,
    maxRewriteLiteralLength: 256
  });
  var IMMUTABLE_LIVE_DENY_PATHS = Object.freeze([
    "**/.env",
    "**/.env.*",
    "**/*.pem",
    "**/*.key",
    "**/*.p12",
    "**/id_rsa*",
    "**/id_ed25519*",
    "**/credentials*",
    "**/secrets/**",
    "**/.aws/**",
    "**/.ssh/**",
    "dms/**",
    "**/private/**"
  ]);
  var SECRET_KEY_MARKERS = Object.freeze([
    "password",
    "passphrase",
    "secret",
    "token",
    "apikey",
    "authorization",
    "cookie",
    "otp",
    "onetimecode",
    "recoverycode",
    "credential",
    "privatekey",
    "e2eekey",
    "accesstoken",
    "refreshtoken",
    "sessionsalt",
    "signingkey",
    "clientsecret",
    "webhooksecret",
    "bearer"
  ]);
  var FORBIDDEN_KEYS = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);
  function normalizeLivePath(path) {
    const cleaned = path.normalize("NFKC").replaceAll("\\", "/").replace(/^\/+/u, "").replace(/\/+$/u, "");
    const segments = [];
    for (const segment of cleaned.split("/")) {
      if (segment === "" || segment === ".") continue;
      if (segment === "..") return "";
      segments.push(segment);
    }
    return segments.join("/");
  }
  function pathMatchesLivePattern(path, pattern) {
    const cleaned = normalizeLivePattern(pattern);
    if (cleaned === "") return false;
    if (cleaned === "**") return true;
    if (cleaned.endsWith("/**")) {
      const prefix = cleaned.slice(0, -3);
      if (path === prefix || path.startsWith(`${prefix}/`)) return true;
    }
    const escaped = cleaned.replaceAll("**/", "\0dbl\0").replaceAll("**", "\0all\0").replaceAll("*", "\0one\0").replaceAll(/[.+^${}()|[\]\\]/gu, "\\$&").replaceAll("\0dbl\0", "(?:.*/)?").replaceAll("\0all\0", ".*").replaceAll("\0one\0", "[^/]*");
    return new RegExp(`^${escaped}$`, "u").test(path);
  }
  function normalizeLivePattern(pattern) {
    return pattern.normalize("NFKC").replaceAll("\\", "/").replace(/^\/+/u, "").replace(/\/+$/u, "");
  }
  function isImmutablyDeniedLivePath(path) {
    const normalized = normalizeLivePath(path);
    if (normalized === "" && path.trim() !== "") return true;
    return IMMUTABLE_LIVE_DENY_PATHS.some((pattern) => pathMatchesLivePattern(normalized, pattern));
  }
  function evaluateLivePath(path, policy) {
    const normalized = normalizeLivePath(path);
    if (normalized === "") return { kind: "deny", reason: "unsafe-pattern" };
    if (isImmutablyDeniedLivePath(normalized)) return { kind: "deny", reason: "immutable-deny" };
    for (const pattern of policy.deniedPathPatterns) {
      if (pattern.startsWith("!")) continue;
      if (pathMatchesLivePattern(normalized, pattern)) return { kind: "deny", reason: "not-in-presentation-view" };
    }
    const allowed = policy.allowedPathPatterns.some((pattern) => !pattern.startsWith("!") && pathMatchesLivePattern(normalized, pattern));
    return allowed ? { kind: "allow" } : { kind: "deny", reason: "not-in-presentation-view" };
  }
  function compileLiveRewriteRules(source) {
    const rules = [];
    const errors = [];
    if (source === void 0 || source.trim() === "") return { rules: Object.freeze(rules), errors: Object.freeze(errors) };
    for (const raw of source.split("\n")) {
      const line = raw.trim();
      if (line === "" || line.startsWith("#")) continue;
      if (rules.length >= LIVE_SANITIZER_BOUNDS.maxRewriteRules) {
        errors.push("too many rewrite rules; later rules ignored");
        break;
      }
      const parsed = /^([A-Za-z][A-Za-z0-9_-]{0,63})\s*=\s*(.+?)\s*→\s*(cipher|drop)$/u.exec(line);
      if (parsed === null) {
        errors.push(`unsupported rewrite rule syntax: '${line.slice(0, 40)}'`);
        continue;
      }
      const match = parsed[2] ?? "";
      if (match.length > LIVE_SANITIZER_BOUNDS.maxRewriteLiteralLength) {
        errors.push("rewrite rule literal too long");
        continue;
      }
      if (/[\\^$.|?+()[\]{}]/u.test(match)) {
        errors.push(`rewrite rules accept literals and '*' globs only: '${parsed[1]}'`);
        continue;
      }
      rules.push({ name: parsed[1], match, mode: parsed[3] === "drop" ? "drop" : "cipher" });
    }
    return { rules: Object.freeze(rules), errors: Object.freeze(errors) };
  }
  function applyRewriteRules(text, rules, sessionSalt) {
    let output = text;
    for (const rule of rules) {
      const matched = rule.match.includes("*") ? globMatches(output, rule.match) : output.includes(rule.match) ? [rule.match] : [];
      if (matched.length === 0) continue;
      if (rule.mode === "drop") return { text: "", dropped: true };
      for (const value of matched) {
        output = output.split(value).join(cipherToken(sessionSalt, rule.name, value));
      }
    }
    output = maskEmails(output, sessionSalt);
    return { text: output, dropped: false };
  }
  function globMatches(text, pattern) {
    const parts = pattern.split("*");
    const matches = [];
    for (const token of text.split(/(\s+)/u)) {
      if (token.trim() === "") continue;
      if (tokenMatchesGlob(token, parts)) matches.push(token);
    }
    return matches;
  }
  function tokenMatchesGlob(token, parts) {
    let cursor = 0;
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index] ?? "";
      if (part === "") continue;
      const at = token.indexOf(part, cursor);
      if (at === -1) return false;
      if (index === 0 && at !== 0) return false;
      cursor = at + part.length;
    }
    const last = parts[parts.length - 1] ?? "";
    return last === "" || token.endsWith(last);
  }
  var EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu;
  function maskEmails(text, sessionSalt) {
    EMAIL_PATTERN.lastIndex = 0;
    return text.replace(EMAIL_PATTERN, (match) => cipherToken(sessionSalt, "email", match));
  }
  function sanitizeLiveArgs(args, context) {
    if (context.protectedInput === true) return { kind: "drop", reason: "protected-input" };
    const state = { bytes: 0, seen: /* @__PURE__ */ new Set() };
    const result = sanitizeValue(args, context, state, 0);
    if (result.kind === "fail") return { kind: "drop", reason: result.reason };
    if (!isDictionary(result.value)) return { kind: "drop", reason: "unsafe-object-shape" };
    return { kind: "emit", args: result.value };
  }
  function sanitizeValue(value, context, state, depth) {
    if (depth > LIVE_SANITIZER_BOUNDS.maxDepth) return { kind: "fail", reason: "depth-exceeded" };
    if (value === null) return { kind: "ok", value: null };
    if (value === void 0) return { kind: "fail", reason: "unsafe-object-shape" };
    if (__epochIsString6(value)) return sanitizeString(value, context, state);
    if (isBooleanValue(value)) return { kind: "ok", value };
    if (isNumberValue(value)) {
      return Number.isFinite(value) ? { kind: "ok", value } : { kind: "fail", reason: "unsafe-object-shape" };
    }
    if (isBigIntValue(value)) return { kind: "fail", reason: "unsafe-object-shape" };
    if (Array.isArray(value)) return sanitizeArray(value, context, state, depth);
    if (isDictionary(value)) return sanitizeObject(value, context, state, depth);
    return { kind: "fail", reason: "unsafe-object-shape" };
  }
  function sanitizeString(value, context, state) {
    if (value.length > LIVE_SANITIZER_BOUNDS.maxStringLength) return { kind: "fail", reason: "payload-too-large" };
    state.bytes += value.length;
    if (state.bytes > LIVE_SANITIZER_BOUNDS.maxCanonicalBytes) return { kind: "fail", reason: "payload-too-large" };
    const normalized = value.normalize("NFKC");
    if (containsSecretMaterial(normalized)) return { kind: "fail", reason: "immutable-deny" };
    const rewritten = applyRewriteRules(normalized, context.rewriteRules, context.sessionSalt);
    if (rewritten.dropped) return { kind: "fail", reason: "rewrite-drop" };
    return { kind: "ok", value: rewritten.text };
  }
  function sanitizeArray(value, context, state, depth) {
    if (value.length > LIVE_SANITIZER_BOUNDS.maxArrayElements) return { kind: "fail", reason: "payload-too-large" };
    const identity = value;
    if (state.seen.has(identity)) return { kind: "fail", reason: "unsafe-object-shape" };
    state.seen.add(identity);
    const items = [];
    for (const item of value) {
      const result = sanitizeValue(item, context, state, depth + 1);
      if (result.kind === "fail") return result;
      items.push(result.value);
    }
    state.seen.delete(identity);
    return { kind: "ok", value: Object.freeze(items) };
  }
  function sanitizeObject(value, context, state, depth) {
    if (state.seen.has(value)) return { kind: "fail", reason: "unsafe-object-shape" };
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return { kind: "fail", reason: "unsafe-object-shape" };
    if (Object.getOwnPropertySymbols(value).length > 0) return { kind: "fail", reason: "unsafe-object-shape" };
    const names = Object.getOwnPropertyNames(value);
    if (names.length > LIVE_SANITIZER_BOUNDS.maxObjectKeys) return { kind: "fail", reason: "payload-too-large" };
    state.seen.add(value);
    const output = {};
    for (const key of names) {
      if (FORBIDDEN_KEYS.has(key)) return { kind: "fail", reason: "unsafe-object-shape" };
      const descriptor2 = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor2 === void 0 || descriptor2.get !== void 0 || descriptor2.set !== void 0) {
        return { kind: "fail", reason: "unsafe-object-shape" };
      }
      state.bytes += key.length;
      if (state.bytes > LIVE_SANITIZER_BOUNDS.maxCanonicalBytes) return { kind: "fail", reason: "payload-too-large" };
      if (isSecretKeyName(key)) return { kind: "fail", reason: "immutable-deny" };
      const result = sanitizeValue(descriptor2.value, context, state, depth + 1);
      if (result.kind === "fail") return result;
      output[key] = result.value;
    }
    state.seen.delete(value);
    return { kind: "ok", value: Object.freeze(output) };
  }
  function isSecretKeyName(key) {
    const normalized = key.normalize("NFKC").toLowerCase().replaceAll(/[^a-z0-9]/gu, "");
    return SECRET_KEY_MARKERS.some((marker) => normalized.includes(marker));
  }
  function containsSecretMaterial(value) {
    if (value.includes("-----BEGIN") && value.includes("PRIVATE KEY")) return true;
    return /\bBearer\s+[A-Za-z0-9._~+/-]{8,}/u.test(value);
  }
  function isDictionary(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function isBooleanValue(value) {
    return typeof value === "boolean";
  }
  function isNumberValue(value) {
    return typeof value === "number";
  }
  function isBigIntValue(value) {
    return typeof value === "bigint";
  }
  function runLivePreflight(input) {
    const errors = [...input.rewriteErrors ?? []];
    const warnings = [];
    const policy = input.policy;
    if (policy.allowedPathPatterns.length === 0 && policy.allowedActionIds.length === 0) {
      errors.push("nothing is allow-listed: add at least one presentation path pattern or stream-safe action");
    }
    const requiredConsentScopes = requiredScopesFor(policy);
    const granted = new Set(input.consentScopes ?? []);
    const missingConsentScopes = requiredConsentScopes.filter((scope) => !granted.has(scope));
    if (missingConsentScopes.length > 0) {
      errors.push(`missing consent scopes: ${missingConsentScopes.join(", ")}`);
    }
    const wantsMedia = policy.media.audio || policy.media.camera || policy.media.screenShare;
    if (wantsMedia && input.mediaProviderReady !== true) {
      warnings.push("media provider is not ready; the session can still start semantic-only");
    }
    if (policy.media.captions === "required" && input.captionProviderReady !== true && wantsMedia) {
      errors.push("captions are required but no caption provider is ready");
    }
    if (policy.visibility === "public" || policy.visibility === "unlisted") {
      warnings.push("released data may be copied by spectators and cannot be recalled");
    }
    return {
      sessionId: input.sessionId,
      spaceId: input.spaceId,
      policyDigest: input.policyDigest,
      presentationViewRef: policy.presentationViewRef,
      allowedPathPatterns: policy.allowedPathPatterns,
      allowedActionIds: policy.allowedActionIds,
      immutableDenials: IMMUTABLE_LIVE_DENY_PATHS,
      requiredConsentScopes,
      missingConsentScopes: Object.freeze(missingConsentScopes),
      warnings: Object.freeze(warnings),
      errors: Object.freeze(errors),
      startAllowed: errors.length === 0
    };
  }
  function requiredScopesFor(policy) {
    const scopes = ["semantic-capture"];
    if (policy.media.audio) scopes.push("audio");
    if (policy.media.camera) scopes.push("camera");
    if (policy.media.screenShare) scopes.push("screen-share");
    if (policy.media.recording) scopes.push("recording");
    if (policy.media.externalEgress.length > 0) scopes.push("external-egress");
    return Object.freeze(scopes);
  }

  // packages/Epoch.Community.Runtime/src/live/presentation-log.ts
  var UNKNOWN_ACTION = Object.freeze({ streamSafe: false, replayEffect: "never-replay" });
  function createLiveActionCatalog(entries) {
    const catalog = /* @__PURE__ */ new Map();
    for (const [actionId, policy] of Object.entries(entries)) {
      catalog.set(actionId.normalize("NFKC"), Object.freeze({ ...policy }));
    }
    return {
      policyFor(actionId) {
        return catalog.get(actionId.normalize("NFKC")) ?? UNKNOWN_ACTION;
      },
      get streamSafeActionIds() {
        return [...catalog.entries()].filter(([, policy]) => policy.streamSafe).map(([actionId]) => actionId).sort();
      }
    };
  }
  var DEFAULT_MAX_QUEUE = 2048;
  function createLivePresentationPublisher(options) {
    const startedAtMs = options.now();
    const maxQueue = options.maxQueuedEnvelopes ?? DEFAULT_MAX_QUEUE;
    let policy = options.policy;
    let policyDigest = livePolicyDigest(policy);
    const rewriteRules = options.rewriteRules ?? [];
    let paused = false;
    let degraded = false;
    let sequence = 0;
    const queue = [];
    const released = [];
    const checkpoints = [];
    const quarantine = [];
    function evaluate(input) {
      if (input.sourceVerified !== true) return { kind: "fail", reason: "unverified-source" };
      const normalizedAction = input.actionId.normalize("NFKC");
      if (!options.catalog.policyFor(normalizedAction).streamSafe) {
        return { kind: "fail", reason: "action-not-stream-safe" };
      }
      if (!policy.allowedActionIds.includes(normalizedAction)) {
        return { kind: "fail", reason: "action-not-stream-safe" };
      }
      if (input.path !== void 0) {
        const pathDecision = evaluateLivePath(input.path, policy);
        if (pathDecision.kind === "deny") return { kind: "fail", reason: pathDecision.reason };
      }
      const decision = sanitizeLiveArgs(input.args, {
        policy,
        rewriteRules,
        sessionSalt: options.sessionSalt,
        ...input.protectedInput === true && { protectedInput: true }
      });
      if (decision.kind !== "emit") return { kind: "fail", reason: decision.reason };
      return { kind: "ok", args: decision.args };
    }
    function record(reason, actionId, stage) {
      if (quarantine.length < DEFAULT_MAX_QUEUE) quarantine.push({ reason, actionId, stage });
    }
    return {
      capture(input) {
        if (queue.length >= maxQueue) {
          degraded = true;
          record("queue-overflow", input.actionId, "capture");
          return { kind: "dropped", reason: "queue-overflow" };
        }
        const evaluated = evaluate(input);
        if (evaluated.kind === "fail") {
          record(evaluated.reason, input.actionId, "capture");
          return { kind: "dropped", reason: evaluated.reason };
        }
        const queuedAtMs = options.now();
        queue.push({ input, queuedAtMs, policyDigestAtCapture: policyDigest });
        return { kind: "queued", queuedAtMs };
      },
      release() {
        if (paused) return [];
        const nowMs = options.now();
        const releasedNow = [];
        while (queue.length > 0) {
          const head = queue[0];
          if (head === void 0 || head.queuedAtMs + policy.publicationDelayMs > nowMs) break;
          queue.shift();
          const evaluated = evaluate(head.input);
          if (evaluated.kind === "fail") {
            const reason = head.policyDigestAtCapture === policyDigest ? evaluated.reason : "policy-stale";
            record(reason, head.input.actionId, "release");
            continue;
          }
          sequence += 1;
          const payloadDigest = digestOf({
            actionId: head.input.actionId,
            args: evaluated.args,
            path: head.input.path ?? null,
            sourceEventIds: head.input.sourceEventIds
          });
          const envelope = {
            schemaVersion: 2,
            sessionId: options.sessionId,
            sequence,
            actorId: head.input.actorId,
            actionId: head.input.actionId.normalize("NFKC"),
            args: evaluated.args,
            ...head.input.path !== void 0 && { path: head.input.path },
            sourceEventIds: head.input.sourceEventIds,
            sourceViewRef: head.input.sourceViewRef,
            policyDigest,
            presentationOffsetMs: Math.max(0, nowMs - startedAtMs),
            payloadDigest,
            liveEventId: identifier("liveevt", { sessionId: options.sessionId, sequence, payloadDigest })
          };
          released.push(envelope);
          releasedNow.push(envelope);
        }
        return Object.freeze(releasedNow);
      },
      pause() {
        paused = true;
      },
      resume() {
        paused = false;
      },
      updatePolicy(input) {
        const change = classifyLivePolicyChange(policy, input.policy);
        if ((change === "widening" || change === "mixed") && input.confirmed !== true) {
          return { kind: "refused", change, reason: "policy widening requires explicit confirmation and refreshed consent" };
        }
        policy = input.policy;
        policyDigest = livePolicyDigest(policy);
        let invalidatedQueued = 0;
        if (change === "narrowing" || change === "mixed") {
          for (let index = queue.length - 1; index >= 0; index -= 1) {
            const entry = queue[index];
            if (entry === void 0) continue;
            const evaluated = evaluate(entry.input);
            if (evaluated.kind === "fail") {
              queue.splice(index, 1);
              invalidatedQueued += 1;
              record("policy-stale", entry.input.actionId, "release");
            }
          }
        }
        return { kind: "applied", change, policyDigest, invalidatedQueued };
      },
      checkpoint() {
        const head = digestOf(released.map((envelope) => envelope.liveEventId));
        const checkpoint = {
          schemaVersion: 1,
          sessionId: options.sessionId,
          checkpointId: identifier("livechk", { sessionId: options.sessionId, sequence, head }),
          sequence,
          presentationLogHead: head,
          sourceViewRef: policy.presentationViewRef,
          policyDigest,
          presentationOffsetMs: Math.max(0, options.now() - startedAtMs)
        };
        checkpoints.push(checkpoint);
        return checkpoint;
      },
      buildReplayManifest(completeness) {
        const head = digestOf(released.map((envelope) => envelope.liveEventId));
        return {
          schemaVersion: 1,
          replayId: identifier("livereplay", { sessionId: options.sessionId, head }),
          sessionId: options.sessionId,
          presentationLogHead: head,
          presentationEventIds: released.map((envelope) => envelope.liveEventId),
          checkpointIds: checkpoints.map((checkpoint) => checkpoint.checkpointId),
          policyDigests: [...new Set(released.map((envelope) => envelope.policyDigest))],
          completeness
        };
      },
      releasedEnvelopes() {
        return [...released];
      },
      quarantined() {
        return [...quarantine];
      },
      state() {
        return {
          sequence,
          queuedCount: queue.length,
          releasedCount: released.length,
          paused,
          health: degraded ? "degraded" : "live",
          policyDigest
        };
      }
    };
  }
  function createLiveSpectatorProjection(options) {
    let lastSequence = 0;
    const applied = [];
    const digestBySequence = /* @__PURE__ */ new Map();
    const pending = /* @__PURE__ */ new Map();
    let quarantinedCount = 0;
    function verify(envelope) {
      if (envelope.schemaVersion !== 2) return "schema-invalid";
      if (envelope.sessionId !== options.sessionId) return "unverified-source";
      const expected = digestOf({
        actionId: envelope.actionId,
        args: envelope.args,
        path: envelope.path ?? null,
        sourceEventIds: envelope.sourceEventIds
      });
      if (expected !== envelope.payloadDigest) return "unverified-source";
      return void 0;
    }
    function applyOne(envelope) {
      const invalid = verify(envelope);
      if (invalid !== void 0) {
        quarantinedCount += 1;
        return { kind: "quarantined", reason: invalid };
      }
      if (envelope.sequence <= lastSequence) {
        const known = digestBySequence.get(envelope.sequence);
        if (known === envelope.payloadDigest) return { kind: "duplicate", sequence: envelope.sequence };
        quarantinedCount += 1;
        return { kind: "quarantined", reason: "sequence-conflict" };
      }
      if (envelope.sequence > lastSequence + 1) {
        pending.set(envelope.sequence, envelope);
        return { kind: "gap", missingFrom: lastSequence + 1, missingTo: envelope.sequence - 1 };
      }
      lastSequence = envelope.sequence;
      applied.push(envelope);
      digestBySequence.set(envelope.sequence, envelope.payloadDigest);
      return { kind: "applied", sequence: envelope.sequence };
    }
    function drainPending() {
      let next = pending.get(lastSequence + 1);
      while (next !== void 0) {
        pending.delete(next.sequence);
        applyOne(next);
        next = pending.get(lastSequence + 1);
      }
    }
    return {
      apply(envelope) {
        const result = applyOne(envelope);
        if (result.kind === "applied") drainPending();
        return result;
      },
      resyncFrom(checkpoint, envelopes) {
        if (checkpoint.sessionId === options.sessionId && checkpoint.sequence >= lastSequence) {
          lastSequence = checkpoint.sequence;
        }
        const results = envelopes.map((envelope) => applyOne(envelope));
        drainPending();
        return Object.freeze(results);
      },
      /**
       * Replay is confined to the spectator's disposable presentation
       * projection. Unknown and privileged actions never execute; the host's
       * theme and view preferences never override the spectator's own.
       */
      replayDecision(envelope, catalog) {
        if (isSpectatorViewPreference(envelope.actionId)) return { kind: "skip", reason: "view-preference" };
        const actionPolicy = catalog.policyFor(envelope.actionId);
        if (!actionPolicy.streamSafe || actionPolicy.replayEffect === "never-replay") {
          return { kind: "skip", reason: "action-not-stream-safe" };
        }
        return { kind: "apply", effect: actionPolicy.replayEffect };
      },
      appliedEnvelopes() {
        return [...applied];
      },
      state() {
        return {
          lastSequence,
          appliedCount: applied.length,
          pendingCount: pending.size,
          quarantinedCount
        };
      }
    };
  }
  function evaluateLiveForkEligibility(checkpoint, context) {
    if (checkpoint === void 0) return { kind: "refused", reason: "no checkpoint at that point; a media timestamp is not a branch point" };
    if (!context.refVerified) return { kind: "refused", reason: "checkpoint view/ref did not verify" };
    if (!context.hasReadAuthority) return { kind: "refused", reason: "caller lacks read authority for the checkpoint state" };
    if (!context.objectsAvailable) return { kind: "refused", reason: "checkpoint state is not resident and no honest provider can hydrate it" };
    if (!context.policyPermitsCopy) return { kind: "refused", reason: "publication policy does not permit copying this state" };
    return { kind: "forkable", checkpointId: checkpoint.checkpointId, sourceViewRef: checkpoint.sourceViewRef };
  }

  // packages/Epoch.Community.Runtime/src/live/transport.ts
  function createInMemoryLiveTransport(options = {}) {
    const channels = /* @__PURE__ */ new Map();
    function channel(sessionId) {
      const existing = channels.get(sessionId);
      if (existing !== void 0) return existing;
      const created = { envelopes: [], subscribers: /* @__PURE__ */ new Set() };
      channels.set(sessionId, created);
      return created;
    }
    return {
      snapshot(input) {
        const session = channel(input.sessionId);
        const after = input.afterSequence ?? session.checkpoint?.sequence ?? 0;
        return Promise.resolve({
          ...session.checkpoint !== void 0 && { checkpoint: session.checkpoint },
          envelopes: session.envelopes.filter((envelope) => envelope.sequence > after),
          releasedThroughSequence: session.envelopes.at(-1)?.sequence ?? 0
        });
      },
      events(input) {
        const session = channel(input.sessionId);
        const limit = input.limit ?? 512;
        return Promise.resolve(session.envelopes.filter((envelope) => envelope.sequence > input.afterSequence).slice(0, limit));
      },
      subscribe(input) {
        const session = channel(input.sessionId);
        const subscriber = {
          onEnvelope: input.onEnvelope,
          ...input.onStatus !== void 0 && { onStatus: input.onStatus }
        };
        session.subscribers.add(subscriber);
        input.onStatus?.({ connection: "open" });
        for (const envelope of session.envelopes) {
          if (envelope.sequence > input.afterSequence) input.onEnvelope(envelope);
        }
        return {
          close() {
            session.subscribers.delete(subscriber);
          }
        };
      },
      push(sessionId, envelopes) {
        const session = channel(sessionId);
        for (const envelope of envelopes) {
          const known = session.envelopes.some((item) => item.sequence === envelope.sequence);
          if (!known) session.envelopes.push(envelope);
          if (known && options.deliverDuplicates !== true) continue;
          for (const subscriber of session.subscribers) subscriber.onEnvelope(envelope);
        }
        session.envelopes.sort((left, right) => left.sequence - right.sequence);
      },
      /** Frames the host released that never reached this subscriber — a real gap. */
      withhold(sessionId, envelopes) {
        const session = channel(sessionId);
        for (const envelope of envelopes) {
          if (!session.envelopes.some((item) => item.sequence === envelope.sequence)) {
            session.envelopes.push(envelope);
          }
        }
        session.envelopes.sort((left, right) => left.sequence - right.sequence);
      },
      recordCheckpoint(sessionId, checkpoint) {
        channel(sessionId).checkpoint = checkpoint;
      },
      dropSubscribers(sessionId, reason) {
        const session = channel(sessionId);
        for (const subscriber of session.subscribers) {
          subscriber.onStatus?.({ connection: "failed", reason });
        }
        session.subscribers.clear();
      },
      subscriberCount(sessionId) {
        return channel(sessionId).subscribers.size;
      }
    };
  }
  var DEFAULT_BASE_BACKOFF_MS = 500;
  var DEFAULT_MAX_BACKOFF_MS = 3e4;
  var DEFAULT_MAX_RECONNECT_ATTEMPTS = 6;
  function createLivePresentationClient(options) {
    const projection = createLiveSpectatorProjection({ sessionId: options.sessionId });
    const baseBackoffMs = options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS;
    const maxBackoffMs = options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
    const maxReconnectAttempts = options.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS;
    let connection = "idle";
    let subscription;
    let cancelRetry;
    let lastCheckpointId;
    let gapRecoveries = 0;
    let reconnectAttempts = 0;
    let stale = false;
    let stopped = false;
    let recovering = false;
    function snapshotState() {
      const state = projection.state();
      return {
        connection,
        lastSequence: state.lastSequence,
        ...lastCheckpointId !== void 0 && { lastCheckpointId },
        appliedCount: state.appliedCount,
        quarantinedCount: state.quarantinedCount,
        gapRecoveries,
        reconnectAttempts,
        stale
      };
    }
    function emit() {
      const state = snapshotState();
      options.onChange?.(state);
      return state;
    }
    function setConnection(next) {
      connection = next;
      emit();
    }
    async function hydrate() {
      const snapshot = await options.transport.snapshot({
        sessionId: options.sessionId,
        afterSequence: projection.state().lastSequence
      });
      if (snapshot.checkpoint !== void 0) {
        lastCheckpointId = snapshot.checkpoint.checkpointId;
        projection.resyncFrom(snapshot.checkpoint, snapshot.envelopes);
      } else {
        for (const envelope of snapshot.envelopes) projection.apply(envelope);
      }
      stale = projection.state().lastSequence < snapshot.releasedThroughSequence;
    }
    async function recoverGap() {
      if (recovering || stopped) return;
      recovering = true;
      try {
        gapRecoveries += 1;
        setConnection("recovering");
        const missing = await options.transport.events({
          sessionId: options.sessionId,
          afterSequence: projection.state().lastSequence
        });
        for (const envelope of missing) projection.apply(envelope);
        if (projection.state().pendingCount > 0) await hydrate();
        stale = projection.state().pendingCount > 0;
        setConnection(subscription === void 0 ? "idle" : "open");
      } finally {
        recovering = false;
      }
    }
    function handle(envelope) {
      const result = projection.apply(envelope);
      if (result.kind === "gap") {
        void recoverGap();
        return;
      }
      if (result.kind === "applied") stale = false;
      emit();
    }
    function scheduleReconnect(reason) {
      if (stopped) return;
      if (reconnectAttempts >= maxReconnectAttempts) {
        connection = "failed";
        stale = true;
        emit();
        return;
      }
      reconnectAttempts += 1;
      const jitter = (options.jitter ?? (() => 0.5))();
      const delay = Math.min(maxBackoffMs, baseBackoffMs * 2 ** (reconnectAttempts - 1)) * (0.5 + jitter / 2);
      connection = "recovering";
      stale = true;
      emit();
      cancelRetry = options.schedule(Math.round(delay), () => {
        void reconnect(reason);
      });
    }
    async function reconnect(reason) {
      if (stopped) return;
      try {
        await hydrate();
        openSubscription();
        reconnectAttempts = 0;
      } catch {
        scheduleReconnect(reason);
      }
    }
    function openSubscription() {
      subscription?.close();
      subscription = options.transport.subscribe({
        sessionId: options.sessionId,
        afterSequence: projection.state().lastSequence,
        onEnvelope: handle,
        onStatus: (status) => {
          if (status.connection === "failed" || status.connection === "closed") {
            subscription = void 0;
            scheduleReconnect(status.reason ?? status.connection);
            return;
          }
          setConnection(status.connection);
        }
      });
      setConnection("open");
    }
    return {
      async start() {
        setConnection("connecting");
        await hydrate();
        openSubscription();
        return emit();
      },
      async resync() {
        await hydrate();
        return emit();
      },
      projection() {
        return projection;
      },
      state() {
        return snapshotState();
      },
      stop() {
        stopped = true;
        cancelRetry?.();
        subscription?.close();
        subscription = void 0;
        setConnection("closed");
      }
    };
  }

  // packages/Epoch.Community.Runtime/src/live/commands.ts
  function __epochIsString7(value) {
    return typeof value === "string";
  }
  function __epochIsNumber3(value) {
    return typeof value === "number";
  }
  var DEFAULT_LIVE_ACTION_CATALOG = createLiveActionCatalog({
    "view.open": { streamSafe: true, replayEffect: "presentation-local" },
    "file.reveal": { streamSafe: true, replayEffect: "presentation-local" },
    "diff.show": { streamSafe: true, replayEffect: "presentation-local" },
    "check.report": { streamSafe: true, replayEffect: "presentation-local" },
    "agent.receipt.show": { streamSafe: true, replayEffect: "presentation-local" },
    "history.inspect": { streamSafe: true, replayEffect: "read-only-query" },
    "change.merge": { streamSafe: false, replayEffect: "never-replay" },
    "shell.exec": { streamSafe: false, replayEffect: "never-replay" },
    "grant.modify": { streamSafe: false, replayEffect: "never-replay" }
  });
  function fail(code, message2) {
    throw new EpochCommandError(code, message2);
  }
  function createLocalLiveSpacePort(options) {
    const sessions = /* @__PURE__ */ new Map();
    const catalog = options.catalog ?? DEFAULT_LIVE_ACTION_CATALOG;
    const mediaGateway = options.media;
    const community = options.community;
    let created = 0;
    function requireSession(sessionId) {
      return sessions.get(sessionId) ?? fail("not-found", `live session not found: ${sessionId}`);
    }
    function requireManager(session, actor) {
      const participant = session.participants.get(actor);
      if (participant === void 0 || !participant.active || participant.role !== "owner" && participant.role !== "cohost") {
        fail("policy-denied", `principal ${actor} lacks live.session.manage authority`);
      }
      return participant;
    }
    function requireActive(session, actor) {
      const participant = session.participants.get(actor);
      if (participant === void 0 || !participant.active) {
        fail("policy-denied", `principal ${actor} holds no active grant in this session`);
      }
      return participant;
    }
    function snapshot(session) {
      const state = session.publisher.state();
      return {
        sessionId: session.sessionId,
        spaceId: session.spaceId,
        ownerPrincipalId: session.ownerPrincipalId,
        presentationViewRef: session.policy.presentationViewRef,
        visibility: session.policy.visibility,
        securityMode: session.policy.securityMode,
        lifecycle: session.lifecycle,
        policyDigest: session.policyDigest,
        releasedThroughSequence: state.sequence,
        health: state.health,
        joinLocked: session.joinLocked,
        participants: [...session.participants.values()].map((participant) => ({
          principalId: participant.principalId,
          role: participant.role,
          active: participant.active
        })),
        sealed: session.lifecycle === "sealed",
        ...session.boundThreadId !== void 0 && { boundThreadId: session.boundThreadId }
      };
    }
    function preflightReport(session) {
      const scopes = session.consent.get(session.ownerPrincipalId);
      return runLivePreflight({
        sessionId: session.sessionId,
        spaceId: session.spaceId,
        policy: session.policy,
        policyDigest: session.policyDigest,
        consentScopes: [...scopes ?? []],
        mediaProviderReady: false,
        captionProviderReady: false
      });
    }
    return {
      createSession(input) {
        const space = options.resolveSpace(input.spaceId);
        if (space === void 0) fail("not-found", `space not found: ${input.spaceId}`);
        const normalized = normalizeLivePublicationPolicy({
          ...input.policy,
          presentationViewRef: input.policy.presentationViewRef ?? space.viewRef
        });
        if (normalized.kind === "invalid") {
          fail("invalid-input", `publication policy invalid: ${normalized.errors.join("; ")}`);
        }
        created += 1;
        const sessionId = identifier("livesession", { spaceId: input.spaceId, created });
        const publisher = createLivePresentationPublisher({
          sessionId,
          policy: normalized.policy,
          catalog,
          sessionSalt: `${options.sessionSalt}:${sessionId}`,
          now: options.now,
          ...options.maxQueuedEnvelopes !== void 0 && { maxQueuedEnvelopes: options.maxQueuedEnvelopes }
        });
        const session = {
          sessionId,
          spaceId: input.spaceId,
          ownerPrincipalId: input.actor,
          policy: normalized.policy,
          policyDigest: normalized.digest,
          lifecycle: "draft",
          joinLocked: normalized.policy.audience.joinLocked,
          publisher,
          participants: /* @__PURE__ */ new Map([[input.actor, { principalId: input.actor, role: "owner", active: true }]]),
          consent: /* @__PURE__ */ new Map(),
          checkpoints: /* @__PURE__ */ new Map(),
          bookmarks: [],
          annotations: [],
          grantRequests: [],
          reports: []
        };
        sessions.set(sessionId, session);
        return { data: snapshot(session) };
      },
      showSession(sessionId) {
        return { data: snapshot(requireSession(sessionId)) };
      },
      listSessions() {
        return { data: [...sessions.values()].map(snapshot) };
      },
      bindThread(input) {
        const session = requireSession(input.sessionId);
        if (session.lifecycle === "sealed") fail("conflict", "a sealed session cannot be rebound");
        requireManager(session, input.actor);
        const threadObjectId = input.threadObjectId.trim();
        if (threadObjectId.length === 0 || threadObjectId.length > 512) {
          fail("invalid-input", "a Community thread binding requires a 1..512 character object id");
        }
        session.boundThreadId = threadObjectId;
        return { data: snapshot(session) };
      },
      preflight(sessionId) {
        const session = requireSession(sessionId);
        const report = preflightReport(session);
        return { data: report, validation: validationReceipt(session.sessionId, report.errors) };
      },
      configure(input) {
        const session = requireSession(input.sessionId);
        requireManager(session, input.actor);
        if (session.lifecycle === "sealed") fail("policy-denied", "sealed sessions are immutable");
        const normalized = normalizeLivePublicationPolicy(input.policy);
        if (normalized.kind === "invalid") {
          fail("invalid-input", `publication policy invalid: ${normalized.errors.join("; ")}`);
        }
        const update = session.publisher.updatePolicy({ policy: normalized.policy, confirmed: input.confirmed });
        if (update.kind === "refused") fail("policy-denied", update.reason);
        session.policy = normalized.policy;
        session.policyDigest = normalized.digest;
        if (update.change === "widening" || update.change === "mixed") session.consent.clear();
        return { data: { change: update.change, policyDigest: update.policyDigest, invalidatedQueued: update.invalidatedQueued } };
      },
      recordConsent(input) {
        const session = requireSession(input.sessionId);
        requireActive(session, input.actor);
        if (session.lifecycle === "sealed") fail("policy-denied", "sealed sessions are immutable");
        const scopes = session.consent.get(input.actor) ?? /* @__PURE__ */ new Set();
        for (const scope of input.scopes) scopes.add(scope);
        session.consent.set(input.actor, scopes);
        return {
          data: {
            sessionId: session.sessionId,
            principalId: input.actor,
            policyDigest: session.policyDigest,
            scopes: [...scopes].sort(),
            decision: "granted"
          }
        };
      },
      lifecycle(input) {
        const session = requireSession(input.sessionId);
        requireManager(session, input.actor);
        const decision = nextLiveLifecycle(session.lifecycle, input.command);
        if (decision.kind === "refused") fail("policy-denied", decision.reason);
        if (input.command === "start") {
          const report = preflightReport(session);
          if (!report.startAllowed) {
            fail("policy-denied", `preflight refuses start: ${report.errors.join("; ")}`);
          }
        }
        session.lifecycle = decision.state;
        if (input.command === "pause") session.publisher.pause();
        if (input.command === "resume") session.publisher.resume();
        if (input.command === "end") session.publisher.pause();
        return { data: snapshot(session) };
      },
      seal(input) {
        const session = requireSession(input.sessionId);
        requireManager(session, input.actor);
        const decision = nextLiveLifecycle(session.lifecycle, "seal");
        if (decision.kind === "refused") fail("policy-denied", decision.reason);
        session.manifest = session.publisher.buildReplayManifest(input.completeness);
        session.lifecycle = decision.state;
        return { data: { session: snapshot(session), manifest: session.manifest } };
      },
      join(input) {
        const session = requireSession(input.sessionId);
        if (session.lifecycle === "sealed" || session.lifecycle === "ended") {
          fail("policy-denied", "this session is no longer joinable; its replay may still be readable");
        }
        const existing = session.participants.get(input.actor);
        if (existing?.active === true) return { data: snapshot(session) };
        if (session.joinLocked) fail("policy-denied", "joins are locked for this session");
        if (session.policy.visibility === "private") {
          fail("policy-denied", "private sessions require an explicit grant from the host");
        }
        const spectators = [...session.participants.values()].filter((participant) => participant.active && participant.role === "observer").length;
        if (spectators >= session.policy.audience.maxSpectators) {
          fail("policy-denied", "the session is at its spectator limit");
        }
        session.participants.set(input.actor, { principalId: input.actor, role: "observer", active: true });
        return { data: snapshot(session) };
      },
      requestGrant(input) {
        const session = requireSession(input.sessionId);
        requireActive(session, input.actor);
        session.grantRequests.push({ principalId: input.actor, capability: input.capability });
        return { data: { requested: input.capability, granted: false, pending: session.grantRequests.length } };
      },
      grant(input) {
        const session = requireSession(input.sessionId);
        requireManager(session, input.actor);
        if (input.role === "owner") fail("invalid-input", "ownership is not grantable through live.participant.grant");
        session.participants.set(input.principalId, { principalId: input.principalId, role: input.role, active: true });
        return { data: snapshot(session) };
      },
      revoke(input) {
        const session = requireSession(input.sessionId);
        requireManager(session, input.actor);
        const participant = session.participants.get(input.principalId) ?? fail("not-found", `principal is not a participant: ${input.principalId}`);
        if (participant.role === "owner") fail("policy-denied", "the owner grant cannot be revoked from inside the session");
        participant.active = false;
        session.consent.delete(input.principalId);
        return { data: snapshot(session) };
      },
      lockJoins(input) {
        const session = requireSession(input.sessionId);
        requireManager(session, input.actor);
        session.joinLocked = input.locked;
        return { data: snapshot(session) };
      },
      publish(input) {
        const session = requireSession(input.sessionId);
        const participant = requireActive(session, input.actor);
        if (participant.role === "observer") {
          fail("policy-denied", "observer grants do not authorize publication");
        }
        if (session.lifecycle !== "live") {
          fail("policy-denied", `publication requires a live session; current state is '${session.lifecycle}'`);
        }
        const decision = session.publisher.capture({
          actorId: input.actor,
          actionId: input.actionId,
          args: input.args,
          ...input.path !== void 0 && { path: input.path },
          sourceEventIds: [],
          sourceViewRef: session.policy.presentationViewRef,
          sourceVerified: true
        });
        const releasedNow = session.publisher.release();
        return {
          data: {
            decision,
            releasedNow: releasedNow.length,
            state: session.publisher.state()
          }
        };
      },
      status(sessionId) {
        const session = requireSession(sessionId);
        return {
          data: {
            session: snapshot(session),
            publisher: session.publisher.state(),
            quarantined: session.publisher.quarantined().length,
            envelopes: session.publisher.releasedEnvelopes()
          }
        };
      },
      checkpoint(input) {
        const session = requireSession(input.sessionId);
        requireActive(session, input.actor);
        const checkpoint = session.publisher.checkpoint();
        session.checkpoints.set(checkpoint.checkpointId, checkpoint);
        return { data: checkpoint };
      },
      bookmark(input) {
        const session = requireSession(input.sessionId);
        requireActive(session, input.actor);
        if (!session.checkpoints.has(input.checkpointId)) fail("not-found", `checkpoint not found: ${input.checkpointId}`);
        session.bookmarks.push({ principalId: input.actor, checkpointId: input.checkpointId });
        return { data: { checkpointId: input.checkpointId, bookmarks: session.bookmarks.length } };
      },
      /**
       * An annotation is a Community record on the session's thread, not a note
       * in a private array. Refusing when nothing is bound is the point: an
       * annotation with nowhere canonical to live is the parallel store this
       * design exists to avoid, and it would be unmoderatable and unsearchable.
       */
      async annotate(input) {
        const session = requireSession(input.sessionId);
        requireActive(session, input.actor);
        const checkpoint = session.checkpoints.get(input.checkpointId) ?? fail("not-found", `checkpoint not found: ${input.checkpointId}`);
        if (input.body.trim().length === 0 || input.body.length > 4096) {
          fail("invalid-input", "annotation body must be 1..4096 characters");
        }
        const threadObjectId = session.boundThreadId ?? fail("failed-precondition", "this session is not bound to a Community thread; bind one before annotating");
        if (community === void 0) {
          fail("unavailable", "no Community record store is configured for this workspace");
        }
        const record = await community.recordAnnotation({
          sessionId: session.sessionId,
          threadObjectId,
          principalId: input.actor,
          body: input.body,
          checkpointId: checkpoint.checkpointId,
          // The head is what makes the anchor verifiable: a path alone says
          // where, this says against exactly which released state.
          presentationLogHead: checkpoint.presentationLogHead,
          ...input.path !== void 0 && { path: input.path }
        });
        const annotation = {
          annotationId: identifier("liveanno", {
            sessionId: session.sessionId,
            checkpointId: checkpoint.checkpointId,
            index: session.annotations.length
          }),
          principalId: input.actor,
          checkpointId: checkpoint.checkpointId,
          objectId: record.objectId,
          threadRootId: record.threadRootId,
          ...input.path !== void 0 && { path: input.path }
        };
        session.annotations.push(annotation);
        return { data: annotation };
      },
      async forkAt(input) {
        const session = requireSession(input.sessionId);
        const participant = session.participants.get(input.actor);
        const checkpoint = session.checkpoints.get(input.checkpointId);
        const eligibility = evaluateLiveForkEligibility(checkpoint, {
          refVerified: checkpoint !== void 0,
          hasReadAuthority: participant?.active === true || session.policy.visibility !== "private",
          objectsAvailable: checkpoint !== void 0,
          policyPermitsCopy: session.policy.visibility !== "private" || participant?.active === true
        });
        if (eligibility.kind === "refused") fail("policy-denied", eligibility.reason);
        const forked = session.checkpoints.get(eligibility.checkpointId) ?? fail("not-found", `checkpoint not found: ${input.checkpointId}`);
        const threadObjectId = session.boundThreadId ?? fail("failed-precondition", "this session is not bound to a Community thread; bind one before forking");
        if (community === void 0) {
          fail("unavailable", "no Community record store is configured for this workspace");
        }
        const forkId = identifier("livefork", {
          sessionId: session.sessionId,
          checkpointId: eligibility.checkpointId,
          actor: input.actor
        });
        const record = await community.openFork({
          sessionId: session.sessionId,
          threadObjectId,
          principalId: input.actor,
          checkpointId: eligibility.checkpointId,
          presentationLogHead: forked.presentationLogHead,
          sourceViewRef: eligibility.sourceViewRef,
          policyDigest: forked.policyDigest
        });
        return {
          changeId: record.changeId,
          data: {
            forkId,
            sourceViewRef: eligibility.sourceViewRef,
            changeId: record.changeId,
            objectId: record.objectId,
            // Provenance names the released state, not a wall-clock moment: the
            // log head is what a spectator can verify the fork was taken from.
            provenance: {
              sessionId: session.sessionId,
              checkpointId: eligibility.checkpointId,
              presentationLogHead: forked.presentationLogHead,
              policyDigest: forked.policyDigest
            }
          }
        };
      },
      report(input) {
        const session = requireSession(input.sessionId);
        if (input.reason.trim().length === 0) fail("invalid-input", "a report requires a reason");
        const reportId = identifier("livereport", { sessionId: session.sessionId, index: session.reports.length });
        session.reports.push({ reportId, principalId: input.actor });
        return { data: { reportId, recorded: true } };
      },
      /**
       * A media token is derived authority, never a source of it. Epoch decides
       * first — session state, live grant, join lock, consent, security mode —
       * and only then does the provider mint a short-lived credential scoped to
       * the least privilege that role actually holds.
       */
      async issueMediaToken(input) {
        const session = requireSession(input.sessionId);
        const participant = requireActive(session, input.actor);
        if (session.lifecycle === "ended" || session.lifecycle === "sealed") {
          fail("policy-denied", "media tokens are not issued after a session ends");
        }
        if (session.policy.securityMode === "semantic-only") {
          fail("policy-denied", "semantic-only sessions have no media plane");
        }
        const permitted = permittedSourcesFor(participant.role, session.policy);
        const granted = input.requestedSources.filter((source) => permitted.includes(source));
        const refused = input.requestedSources.filter((source) => !permitted.includes(source));
        if (refused.length > 0) {
          fail("policy-denied", `role '${participant.role}' may not publish: ${refused.join(", ")}`);
        }
        if (granted.length > 0) {
          const consent = session.consent.get(input.actor) ?? /* @__PURE__ */ new Set();
          const missing = granted.map((source) => consentScopeForSource(source)).filter((scope) => !consent.has(scope));
          if (missing.length > 0) fail("policy-denied", `publishing requires consent: ${[...new Set(missing)].join(", ")}`);
        }
        if (mediaGateway === void 0) {
          return {
            data: { refused: "unavailable", reason: MEDIA_UNAVAILABLE },
            validation: validationReceipt("live.media", [MEDIA_UNAVAILABLE])
          };
        }
        const grant = await mediaGateway.issueToken({
          sessionId: session.sessionId,
          participantRef: identifier("livepart", { sessionId: session.sessionId, principalId: input.actor }),
          role: participant.role,
          securityMode: session.policy.securityMode,
          publishSources: granted
        });
        return {
          data: {
            token: grant.token,
            expiresAtMs: grant.expiresAtMs,
            roomRef: grant.roomRef,
            canSubscribe: grant.canSubscribe,
            publishSources: grant.publishSources
          }
        };
      },
      async recordProviderEvent(input) {
        const session = requireSession(input.sessionId);
        if (mediaGateway === void 0) {
          return {
            data: { refused: "unavailable", reason: MEDIA_UNAVAILABLE },
            validation: validationReceipt("live.media", [MEDIA_UNAVAILABLE])
          };
        }
        const record = await mediaGateway.recordProviderEvent({
          sessionId: session.sessionId,
          providerKind: input.providerKind,
          eventKind: input.eventKind,
          roomRef: input.roomRef,
          eventDigest: input.eventDigest
        });
        return { data: { ...record, sessionId: session.sessionId } };
      }
    };
  }
  var MEDIA_UNAVAILABLE = "no media gateway is configured for this deployment";
  function permittedSourcesFor(role, policy) {
    if (role === "observer" || role === "agent") return [];
    const permitted = [];
    if (policy.media.audio) permitted.push("microphone");
    if (policy.media.camera) permitted.push("camera");
    if (policy.media.screenShare) {
      permitted.push("screen-share");
      permitted.push("screen-share-audio");
    }
    return permitted;
  }
  function consentScopeForSource(source) {
    if (source === "microphone") return "audio";
    if (source === "camera") return "camera";
    return "screen-share";
  }
  var PORT_UNAVAILABLE = "no Live Space application port is configured for this workspace";
  function createLiveSpaceCommandExtensions(port, actorOf) {
    function withPort(run) {
      return (input, context) => {
        if (port === void 0) {
          return {
            data: { refused: "unavailable", reason: PORT_UNAVAILABLE },
            validation: validationReceipt("live", [PORT_UNAVAILABLE])
          };
        }
        return run(port, input, context.actor ?? actorOf());
      };
    }
    function withPortAsync(run) {
      return async (input, context) => {
        if (port === void 0) {
          return {
            data: { refused: "unavailable", reason: PORT_UNAVAILABLE },
            validation: validationReceipt("live", [PORT_UNAVAILABLE])
          };
        }
        return run(port, input, context.actor ?? actorOf());
      };
    }
    const extensions = [
      {
        descriptor: descriptor(
          "live.session.create",
          "Create a Live Session bound to an existing Space and View.",
          "live.session.create",
          false,
          false,
          schema2({
            spaceId: stringProperty2("Existing Space id."),
            policy: { type: "object", description: "Publication policy input; allow-list starts empty." }
          }, ["spaceId"])
        ),
        run: withPort((live, input, actor) => live.createSession({
          spaceId: requiredString2(input, "spaceId"),
          actor,
          policy: policyInput(input)
        }))
      },
      {
        descriptor: descriptor(
          "live.session.show",
          "Show one Live Session's state, policy digest, and participants.",
          "live.session.read",
          true,
          false,
          schema2({ sessionId: stringProperty2("Live session id.") }, ["sessionId"])
        ),
        run: withPort((live, input) => live.showSession(requiredString2(input, "sessionId")))
      },
      {
        descriptor: descriptor(
          "live.session.list",
          "List Live Sessions known to this workspace.",
          "live.session.read",
          true,
          false,
          emptySchema2()
        ),
        run: withPort((live) => live.listSessions())
      },
      {
        descriptor: descriptor(
          "live.session.bindThread",
          "Bind the session to the one canonical Community thread every projection targets.",
          "live.session.manage",
          false,
          false,
          schema2({
            sessionId: stringProperty2("Live session id."),
            threadObjectId: stringProperty2("Canonical Community object id for the session's thread.")
          }, ["sessionId", "threadObjectId"])
        ),
        run: withPort((live, input, actor) => live.bindThread({
          sessionId: requiredString2(input, "sessionId"),
          actor,
          threadObjectId: requiredString2(input, "threadObjectId")
        }))
      },
      {
        descriptor: descriptor(
          "live.session.preflight",
          "Validate policy, consent, and readiness; report exactly what an audience would see.",
          "live.session.read",
          true,
          false,
          schema2({ sessionId: stringProperty2("Live session id.") }, ["sessionId"])
        ),
        run: withPort((live, input) => live.preflight(requiredString2(input, "sessionId")))
      },
      {
        descriptor: descriptor(
          "live.session.configure",
          "Replace the publication policy. Widening requires confirmation and refreshed consent.",
          "live.presentation.configure",
          false,
          true,
          schema2({
            sessionId: stringProperty2("Live session id."),
            policy: { type: "object", description: "Replacement publication policy input." }
          }, ["sessionId"])
        ),
        run: withPort((live, input, actor) => live.configure({
          sessionId: requiredString2(input, "sessionId"),
          actor,
          policy: policyInput(input),
          confirmed: true
        }))
      },
      {
        descriptor: descriptor(
          "live.session.consent",
          "Record a participant's consent scopes against the current policy digest.",
          "live.session.manage",
          false,
          false,
          schema2({
            sessionId: stringProperty2("Live session id."),
            scopes: { type: "array", description: "Consent scopes: semantic-capture, audio, camera, screen-share, captions, recording, external-egress." }
          }, ["sessionId", "scopes"])
        ),
        run: withPort((live, input, actor) => live.recordConsent({
          sessionId: requiredString2(input, "sessionId"),
          actor,
          scopes: consentScopes(input)
        }))
      },
      lifecycleExtension("live.session.openLobby", "Open the lobby so authorized participants can join.", "openLobby", false),
      lifecycleExtension("live.session.start", "Start semantic publication. Refused while preflight fails.", "start", true),
      lifecycleExtension("live.session.pause", "Pause publication release at the current sequence.", "pause", false),
      lifecycleExtension("live.session.resume", "Resume publication release.", "resume", false),
      lifecycleExtension("live.session.end", "End the session; no further release or joins.", "end", true),
      {
        descriptor: descriptor(
          "live.session.seal",
          "Seal an ended session into an immutable replay manifest.",
          "live.session.seal",
          false,
          true,
          schema2({
            sessionId: stringProperty2("Live session id."),
            completeness: enumProperty2("Honest replay completeness.", ["complete", "semantic-only", "media-missing", "partial"])
          }, ["sessionId"])
        ),
        run: withPort((live, input, actor) => live.seal({
          sessionId: requiredString2(input, "sessionId"),
          actor,
          completeness: completenessOf(input)
        }))
      },
      {
        descriptor: descriptor(
          "live.participant.join",
          "Join as a scoped observer. Joining never grants write authority.",
          "live.participant.request",
          false,
          false,
          schema2({ sessionId: stringProperty2("Live session id.") }, ["sessionId"])
        ),
        run: withPort((live, input, actor) => live.join({ sessionId: requiredString2(input, "sessionId"), actor }))
      },
      {
        descriptor: descriptor(
          "live.participant.requestGrant",
          "Record a signed request for a capability. Requests never auto-grant.",
          "live.participant.request",
          false,
          false,
          schema2({
            sessionId: stringProperty2("Live session id."),
            capability: stringProperty2("Requested capability, for example live.presentation.publish.")
          }, ["sessionId", "capability"])
        ),
        run: withPort((live, input, actor) => live.requestGrant({
          sessionId: requiredString2(input, "sessionId"),
          actor,
          capability: requiredString2(input, "capability")
        }))
      },
      {
        descriptor: descriptor(
          "live.participant.grant",
          "Grant a scoped session role to a principal.",
          "live.participant.grant",
          false,
          true,
          schema2({
            sessionId: stringProperty2("Live session id."),
            principalId: stringProperty2("Principal to grant."),
            role: enumProperty2("Session role.", ["cohost", "collaborator", "agent", "observer"])
          }, ["sessionId", "principalId", "role"])
        ),
        run: withPort((live, input, actor) => live.grant({
          sessionId: requiredString2(input, "sessionId"),
          actor,
          principalId: requiredString2(input, "principalId"),
          role: roleOf(input)
        }))
      },
      {
        descriptor: descriptor(
          "live.participant.revoke",
          "Revoke a participant's session grant. Future semantic and media operations are denied.",
          "live.participant.revoke",
          false,
          true,
          schema2({
            sessionId: stringProperty2("Live session id."),
            principalId: stringProperty2("Principal to revoke.")
          }, ["sessionId", "principalId"])
        ),
        run: withPort((live, input, actor) => live.revoke({
          sessionId: requiredString2(input, "sessionId"),
          actor,
          principalId: requiredString2(input, "principalId")
        }))
      },
      {
        descriptor: descriptor(
          "live.participant.lockJoins",
          "Lock or unlock new joins without disconnecting current participants.",
          "live.session.manage",
          false,
          false,
          schema2({
            sessionId: stringProperty2("Live session id."),
            locked: booleanProperty2("True locks new joins.")
          }, ["sessionId", "locked"])
        ),
        run: withPort((live, input, actor) => live.lockJoins({
          sessionId: requiredString2(input, "sessionId"),
          actor,
          locked: input.locked === true
        }))
      },
      {
        descriptor: descriptor(
          "live.presentation.publish",
          "Publish one sanitized semantic action into the presentation stream.",
          "live.presentation.publish",
          false,
          false,
          schema2({
            sessionId: stringProperty2("Live session id."),
            actionId: stringProperty2("Stream-safe action id."),
            args: { type: "object", description: "JSON-shaped action arguments; sanitized recursively." },
            path: stringProperty2("Logical Epoch path this action touches.")
          }, ["sessionId", "actionId"])
        ),
        run: withPort((live, input, actor) => live.publish({
          sessionId: requiredString2(input, "sessionId"),
          actor,
          actionId: requiredString2(input, "actionId"),
          args: dictionaryOf(input, "args"),
          ...optionalString2(input, "path") !== void 0 && { path: requiredString2(input, "path") }
        }))
      },
      {
        descriptor: descriptor(
          "live.presentation.status",
          "Report presentation health, sequence, quarantine, and released envelopes.",
          "live.presentation.read",
          true,
          false,
          schema2({ sessionId: stringProperty2("Live session id.") }, ["sessionId"])
        ),
        run: withPort((live, input) => live.status(requiredString2(input, "sessionId")))
      },
      {
        descriptor: descriptor(
          "live.presentation.checkpoint",
          "Record a presentation checkpoint spectators can resync and fork from.",
          "live.presentation.read",
          false,
          false,
          schema2({ sessionId: stringProperty2("Live session id.") }, ["sessionId"])
        ),
        run: withPort((live, input, actor) => live.checkpoint({ sessionId: requiredString2(input, "sessionId"), actor }))
      },
      {
        descriptor: descriptor(
          "live.presentation.bookmark",
          "Bookmark a checkpoint.",
          "live.presentation.annotate",
          false,
          false,
          schema2({
            sessionId: stringProperty2("Live session id."),
            checkpointId: stringProperty2("Checkpoint id.")
          }, ["sessionId", "checkpointId"])
        ),
        run: withPort((live, input, actor) => live.bookmark({
          sessionId: requiredString2(input, "sessionId"),
          actor,
          checkpointId: requiredString2(input, "checkpointId")
        }))
      },
      {
        descriptor: descriptor(
          "live.presentation.annotate",
          "Annotate a checkpoint, optionally anchored to a logical path.",
          "live.presentation.annotate",
          false,
          false,
          schema2({
            sessionId: stringProperty2("Live session id."),
            checkpointId: stringProperty2("Checkpoint id."),
            body: stringProperty2("Annotation body."),
            path: stringProperty2("Optional logical path anchor.")
          }, ["sessionId", "checkpointId", "body"])
        ),
        run: withPort((live, input, actor) => live.annotate({
          sessionId: requiredString2(input, "sessionId"),
          actor,
          checkpointId: requiredString2(input, "checkpointId"),
          body: requiredString2(input, "body"),
          ...optionalString2(input, "path") !== void 0 && { path: requiredString2(input, "path") }
        }))
      },
      {
        descriptor: descriptor(
          "live.presentation.forkAt",
          "Fork a materializable checkpoint into normal Epoch work with provenance.",
          "live.presentation.fork",
          false,
          false,
          schema2({
            sessionId: stringProperty2("Live session id."),
            checkpointId: stringProperty2("Checkpoint id; a media timestamp is not a branch point.")
          }, ["sessionId", "checkpointId"])
        ),
        run: withPort((live, input, actor) => live.forkAt({
          sessionId: requiredString2(input, "sessionId"),
          actor,
          checkpointId: requiredString2(input, "checkpointId")
        }))
      },
      {
        descriptor: descriptor(
          "live.media.issueToken",
          "Derive a short-lived, least-privilege media credential after Epoch checks pass.",
          "live.media.subscribe",
          false,
          false,
          schema2({
            sessionId: stringProperty2("Live session id."),
            sources: { type: "array", description: "Requested publish sources; each is checked against the caller's role, the policy, and consent." }
          }, ["sessionId"])
        ),
        run: withPortAsync((live, input, actor) => live.issueMediaToken({
          sessionId: requiredString2(input, "sessionId"),
          actor,
          requestedSources: publishSources(input)
        }))
      },
      {
        descriptor: descriptor(
          "live.media.providerEvent",
          "Record a verified provider webhook as projected media health.",
          "live.media.admin",
          false,
          false,
          schema2({
            sessionId: stringProperty2("Live session id."),
            providerKind: stringProperty2("Provider kind that signed the event."),
            eventKind: stringProperty2("Normalized provider event kind."),
            roomRef: stringProperty2("Opaque provider room reference."),
            eventDigest: stringProperty2("Digest of the verified raw body.")
          }, ["sessionId", "providerKind", "eventKind", "roomRef", "eventDigest"])
        ),
        run: withPortAsync((live, input, actor) => live.recordProviderEvent({
          sessionId: requiredString2(input, "sessionId"),
          actor,
          providerKind: requiredString2(input, "providerKind"),
          eventKind: requiredString2(input, "eventKind"),
          roomRef: requiredString2(input, "roomRef"),
          eventDigest: requiredString2(input, "eventDigest")
        }))
      },
      {
        descriptor: descriptor(
          "live.moderation.report",
          "Report this session or a participant to responders.",
          "live.incident.report",
          false,
          false,
          schema2({
            sessionId: stringProperty2("Live session id."),
            reason: stringProperty2("Why this is being reported.")
          }, ["sessionId", "reason"])
        ),
        run: withPort((live, input, actor) => live.report({
          sessionId: requiredString2(input, "sessionId"),
          actor,
          reason: requiredString2(input, "reason")
        }))
      }
    ];
    return Object.freeze(extensions);
    function lifecycleExtension(kind, summary, command, requiresConfirmation) {
      if (!isLiveLifecycleCommand(command)) fail("invalid-input", `unknown lifecycle command: ${command}`);
      return {
        descriptor: descriptor(
          kind,
          summary,
          command === "end" ? "live.session.end" : "live.session.manage",
          false,
          requiresConfirmation,
          schema2({ sessionId: stringProperty2("Live session id.") }, ["sessionId"])
        ),
        run: withPort((live, input, actor) => live.lifecycle({
          sessionId: requiredString2(input, "sessionId"),
          actor,
          command
        }))
      };
    }
  }
  function descriptor(kind, summary, capability, readOnly, requiresConfirmation, inputSchema) {
    return { kind, summary, capability, readOnly, requiresConfirmation, untrustedContent: false, inputSchema };
  }
  function emptySchema2() {
    return { type: "object", properties: {} };
  }
  function schema2(properties, required = []) {
    return required.length === 0 ? { type: "object", properties } : { type: "object", properties, required };
  }
  function stringProperty2(description) {
    return { type: "string", description };
  }
  function booleanProperty2(description) {
    return { type: "boolean", description };
  }
  function enumProperty2(description, values) {
    return { type: "string", description, enum: values };
  }
  function requiredString2(input, key) {
    const value = input[key];
    if (!__epochIsString7(value) || value.trim().length === 0) {
      fail("invalid-input", `Command input '${key}' must be a non-empty string.`);
    }
    return value;
  }
  function optionalString2(input, key) {
    const value = input[key];
    return __epochIsString7(value) && value.trim().length > 0 ? value : void 0;
  }
  function policyInput(input) {
    const value = input.policy;
    if (value === void 0 || value === null) return {};
    if (!isDictionary2(value)) fail("invalid-input", "Command input 'policy' must be an object.");
    const media = isDictionary2(value.media) ? value.media : {};
    const retention = isDictionary2(value.retention) ? value.retention : {};
    const audience = isDictionary2(value.audience) ? value.audience : {};
    return {
      ...stringField(value.visibility) !== void 0 && { visibility: stringField(value.visibility) ?? "" },
      ...stringField(value.securityMode) !== void 0 && { securityMode: stringField(value.securityMode) ?? "" },
      ...stringField(value.presentationViewRef) !== void 0 && { presentationViewRef: stringField(value.presentationViewRef) ?? "" },
      allowedPathPatterns: stringListField(value.allowedPathPatterns),
      deniedPathPatterns: stringListField(value.deniedPathPatterns),
      allowedActionIds: stringListField(value.allowedActionIds),
      includeAgentReceipts: value.includeAgentReceipts === true,
      includeChecks: value.includeChecks === true,
      media: {
        audio: media.audio === true,
        camera: media.camera === true,
        screenShare: media.screenShare === true,
        ...stringField(media.captions) !== void 0 && { captions: stringField(media.captions) ?? "" },
        recording: media.recording === true,
        externalEgress: stringListField(media.externalEgress)
      },
      ...numberField(value.publicationDelayMs) !== void 0 && { publicationDelayMs: numberField(value.publicationDelayMs) ?? 0 },
      retention: {
        ...stringField(retention.mode) !== void 0 && { mode: stringField(retention.mode) ?? "" },
        ...numberField(retention.days) !== void 0 && { days: numberField(retention.days) ?? 0 }
      },
      audience: {
        ...numberField(audience.maxSpectators) !== void 0 && { maxSpectators: numberField(audience.maxSpectators) ?? 0 },
        ...numberField(audience.maxPublishers) !== void 0 && { maxPublishers: numberField(audience.maxPublishers) ?? 0 },
        joinLocked: audience.joinLocked === true
      }
    };
  }
  function stringField(value) {
    return __epochIsString7(value) ? value : void 0;
  }
  function numberField(value) {
    return __epochIsNumber3(value) ? value : void 0;
  }
  function stringListField(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(__epochIsString7);
  }
  function dictionaryOf(input, key) {
    const value = input[key];
    if (value === void 0 || value === null) return {};
    if (!isDictionary2(value)) fail("invalid-input", `Command input '${key}' must be an object.`);
    return value;
  }
  function consentScopes(input) {
    const value = input.scopes;
    if (!Array.isArray(value)) fail("invalid-input", "Command input 'scopes' must be an array of consent scopes.");
    const scopes = [];
    for (const scope of value) {
      if (!__epochIsString7(scope) || !isLiveConsentScope(scope)) {
        fail("invalid-input", `Unknown consent scope '${String(scope)}'.`);
      }
      scopes.push(scope);
    }
    return scopes;
  }
  function completenessOf(input) {
    const value = optionalString2(input, "completeness") ?? "semantic-only";
    if (value !== "complete" && value !== "semantic-only" && value !== "media-missing" && value !== "partial") {
      fail("invalid-input", `Unknown replay completeness '${value}'.`);
    }
    return value;
  }
  function publishSources(input) {
    const value = input.sources;
    if (value === void 0 || value === null) return [];
    if (!Array.isArray(value)) fail("invalid-input", "Command input 'sources' must be an array of publish sources.");
    const sources = [];
    for (const source of value) {
      if (!__epochIsString7(source) || source !== "microphone" && source !== "camera" && source !== "screen-share" && source !== "screen-share-audio") {
        fail("invalid-input", `Unknown media publish source '${String(source)}'.`);
      }
      sources.push(source);
    }
    return sources;
  }
  function roleOf(input) {
    const value = requiredString2(input, "role");
    if (value !== "cohost" && value !== "collaborator" && value !== "agent" && value !== "observer") {
      fail("invalid-input", `Unsupported live session role '${value}'.`);
    }
    return value;
  }
  function isDictionary2(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  // packages/Epoch.Community.Runtime/src/live/client.ts
  function createLiveSpaceClient(runtime) {
    function run(kind, input, confirmed = false) {
      return runtime.commands.execute({ kind, input, source: "sdk", confirmed });
    }
    return {
      create: (input) => run("live.session.create", {
        spaceId: input.spaceId,
        policy: policyToJson(input.policy)
      }),
      show: (sessionId) => run("live.session.show", { sessionId }),
      list: () => run("live.session.list", {}),
      preflight: (sessionId) => run("live.session.preflight", { sessionId }),
      consent: (sessionId, scopes) => run("live.session.consent", { sessionId, scopes: [...scopes] }),
      openLobby: (sessionId) => run("live.session.openLobby", { sessionId }),
      start: (sessionId, options) => run("live.session.start", { sessionId }, options?.confirmed === true),
      pause: (sessionId) => run("live.session.pause", { sessionId }),
      resume: (sessionId) => run("live.session.resume", { sessionId }),
      end: (sessionId, options) => run("live.session.end", { sessionId }, options?.confirmed === true),
      seal: (sessionId, input) => run("live.session.seal", {
        sessionId,
        ...input?.completeness !== void 0 && { completeness: input.completeness }
      }, input?.confirmed === true),
      publish: (input) => run("live.presentation.publish", {
        sessionId: input.sessionId,
        actionId: input.actionId,
        args: input.args ?? {},
        ...input.path !== void 0 && { path: input.path }
      }),
      status: (sessionId) => run("live.presentation.status", { sessionId }),
      checkpoint: (sessionId) => run("live.presentation.checkpoint", { sessionId }),
      join: (sessionId) => run("live.participant.join", { sessionId }),
      requestGrant: (sessionId, capability) => run("live.participant.requestGrant", { sessionId, capability }),
      grant: (input) => run("live.participant.grant", {
        sessionId: input.sessionId,
        principalId: input.principalId,
        role: input.role
      }, input.confirmed === true),
      revoke: (input) => run("live.participant.revoke", {
        sessionId: input.sessionId,
        principalId: input.principalId
      }, input.confirmed === true),
      lockJoins: (sessionId, locked) => run("live.participant.lockJoins", { sessionId, locked }),
      bookmark: (sessionId, checkpointId) => run("live.presentation.bookmark", { sessionId, checkpointId }),
      annotate: (input) => run("live.presentation.annotate", {
        sessionId: input.sessionId,
        checkpointId: input.checkpointId,
        body: input.body,
        ...input.path !== void 0 && { path: input.path }
      }),
      forkAt: (sessionId, checkpointId) => run("live.presentation.forkAt", { sessionId, checkpointId }),
      report: (sessionId, reason) => run("live.moderation.report", { sessionId, reason })
    };
  }
  function policyToJson(policy) {
    const encoded = JSON.parse(JSON.stringify(policy));
    if (!isJsonDictionary2(encoded)) {
      throw new EpochCommandError("invalid-input", "Live publication policy must be a JSON object.");
    }
    return encoded;
  }
  function isJsonDictionary2(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  // packages/Epoch.Community.Runtime/src/board-honesty.ts
  function __epochIsNumber4(value) {
    return typeof value === "number";
  }
  var RECEIPT = /^(sig:|intent:\/\/|agent-run:\/\/)([^\s]+)$/u;
  function parseBoardReceiptLocator(raw) {
    const text = String(raw || "").trim();
    const match = RECEIPT.exec(text);
    if (!match) return null;
    const prefix = match[1];
    const id = match[2];
    const kind = prefix === "sig:" ? "sig" : prefix === "intent://" ? "intent" : "agent-run";
    const title = kind === "sig" ? "Signature receipt" : kind === "intent" ? "Intent receipt" : "Agent-run receipt";
    return Object.freeze({ kind, locator: text, id, title, inspectable: true });
  }
  function openBoardReceipt(raw) {
    const receipt = parseBoardReceiptLocator(raw);
    if (!receipt) return { kind: "unknown", reason: "not-a-receipt" };
    return { kind: "open", receipt };
  }
  function preservedSearchAfterJump(searchQuery) {
    return String(searchQuery ?? "");
  }
  function jumpChooserShouldOpen(input) {
    if (input.kind !== "jump") return false;
    if (input.candidateCount < 1) return false;
    if (input.menuDismissed && !input.intelOpen) return false;
    return true;
  }
  function composerOwnsLetter(input) {
    if (!input.composerFocused) return false;
    return input.key.length === 1;
  }
  function letterSteersBoard(input) {
    if (input.composerFocused) return false;
    if (!input.columnFocus) return false;
    return /^[hjklzyvre]$/iu.test(input.key);
  }
  var SCOPED_ACTIONS = /* @__PURE__ */ new Set(["post.mute", "post.report", "hooks.test", "moderation.report"]);
  function requireScopedTarget(actionId, objectId) {
    if (!SCOPED_ACTIONS.has(actionId)) {
      return { ok: true, actionId, objectId: String(objectId || "") };
    }
    const id = String(objectId || "").trim();
    if (!id) return { ok: false, reason: "unscoped", actionId };
    return { ok: true, actionId, objectId: id };
  }
  function activityFromParticipantEvents(events, input) {
    if (input.sampleBoard) return Object.freeze([]);
    const muted = new Set(input.mutedObjectIds ?? []);
    return Object.freeze(events.filter((event) => {
      if (!event.id || !event.actorId || event.kind === "tick") return false;
      if (muted.has(event.id) || muted.has(event.actorId)) return false;
      return true;
    }));
  }
  function describeReceiptBlade(receipt, source) {
    return Object.freeze({
      kind: receipt.kind,
      locator: receipt.locator,
      id: receipt.id,
      title: receipt.title,
      actor: String(source?.who || "unknown"),
      evidence: String(source?.body || source?.path || receipt.locator),
      inspectable: true
    });
  }
  function honestAgentStatus(status, heartbeatAt, now = Date.now()) {
    if (status === "working" && !(__epochIsNumber4(heartbeatAt) && now - heartbeatAt < 3e4)) {
      return "idle";
    }
    return status || "idle";
  }

  // packages/Epoch.Community.Runtime/src/atproto-oauth.ts
  function __epochIsFunction(value) {
    return typeof value === "function";
  }
  var AtprotoOAuthError = class extends Error {
    constructor(code, message2) {
      super(message2);
      __publicField(this, "code");
      this.name = "AtprotoOAuthError";
      this.code = code;
    }
  };
  var HANDLE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/u;
  function normalizeAtprotoHandle(handle) {
    let value = String(handle || "").trim().replace(/^@/u, "").toLowerCase();
    if (!value) throw new AtprotoOAuthError("invalid-handle", "handle required");
    if (value.indexOf(".") === -1) value = `${value}.bsky.social`;
    if (!HANDLE.test(value)) throw new AtprotoOAuthError("invalid-handle", `invalid handle: ${handle}`);
    return value;
  }
  async function beginAtprotoAuthorization(handle, host) {
    if (!host || !host.authorizationServer || !__epochIsFunction(host.fetch)) {
      throw new AtprotoOAuthError("not-linked", "AT OAuth is not linked \u2014 PAR/PKCE/DPoP required");
    }
    const loginHint = normalizeAtprotoHandle(handle);
    const cryptoApi = host.crypto ?? globalThis.crypto;
    if (!cryptoApi?.subtle) throw new AtprotoOAuthError("crypto", "WebCrypto required for PKCE and DPoP");
    const verifier = base64Url(randomBytes(host, 32));
    const challenge = base64Url(await sha256(cryptoApi, verifier));
    const state = base64Url(randomBytes(host, 16));
    const dpop = await createDpopProof(cryptoApi, "POST", parUrl(host), host);
    const body = new URLSearchParams({
      client_id: host.clientId,
      redirect_uri: host.redirectUri,
      response_type: "code",
      scope: "atproto transition:generic",
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
      login_hint: loginHint
    });
    const response = await host.fetch(parUrl(host), {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        DPoP: dpop.proof
      },
      body: body.toString()
    });
    if (!response.ok) {
      throw new AtprotoOAuthError("par-failed", `PAR failed (${response.status})`);
    }
    const payload = await readJson(response);
    const requestUri = String(payload.request_uri || "");
    if (!requestUri) throw new AtprotoOAuthError("par-failed", "PAR response missing request_uri");
    const authorizationUrl = `${host.authorizationServer.replace(/\/+$/u, "")}/oauth/authorize?client_id=${encodeURIComponent(host.clientId)}&request_uri=${encodeURIComponent(requestUri)}`;
    return Object.freeze({
      authorizationUrl,
      state,
      codeVerifier: verifier,
      codeChallenge: challenge,
      requestUri,
      dpopJkt: dpop.jkt,
      loginHint
    });
  }
  async function finishAtprotoAuthorization(input) {
    if (input.state !== input.expectedState) {
      throw new AtprotoOAuthError("state-mismatch", "OAuth state mismatch");
    }
    if (!input.code) throw new AtprotoOAuthError("missing-code", "authorization code required");
    const cryptoApi = input.host.crypto ?? globalThis.crypto;
    if (!cryptoApi?.subtle) throw new AtprotoOAuthError("crypto", "WebCrypto required for PKCE and DPoP");
    const tokenEndpoint = `${input.host.authorizationServer.replace(/\/+$/u, "")}/oauth/token`;
    const dpop = await createDpopProof(cryptoApi, "POST", tokenEndpoint, input.host);
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: input.host.redirectUri,
      client_id: input.host.clientId,
      code_verifier: input.codeVerifier
    });
    const response = await input.host.fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        DPoP: dpop.proof
      },
      body: body.toString()
    });
    if (!response.ok) throw new AtprotoOAuthError("token-failed", `token exchange failed (${response.status})`);
    const payload = await readJson(response);
    const did = String(payload.sub || payload.did || "");
    if (!did.startsWith("did:")) {
      throw new AtprotoOAuthError("missing-did", "token response did not include a DID");
    }
    if (isHandleHashStub(did, input.loginHint)) {
      throw new AtprotoOAuthError("stub-did", "AT OAuth refused stub DID mint");
    }
    return Object.freeze({
      did,
      handle: String(payload.handle || input.loginHint),
      accessToken: String(payload.access_token || ""),
      tokenType: "DPoP",
      pdsEndpoint: String(payload.iss || input.host.authorizationServer),
      source: "par-pkce-dpop"
    });
  }
  function isHandleHashStub(did, handle) {
    let hash = 0;
    const h = handle;
    for (let index = 0; index < h.length; index += 1) {
      hash = (hash << 5) - hash + h.charCodeAt(index) | 0;
    }
    const stub = `did:plc:${`000000000000000000000000${Math.abs(hash).toString(16)}`.slice(-24)}`;
    return did === stub;
  }
  function parUrl(host) {
    return `${host.authorizationServer.replace(/\/+$/u, "")}/oauth/par`;
  }
  async function createDpopProof(cryptoApi, method, url, host) {
    const pair = await cryptoApi.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
    const jwk = await cryptoApi.subtle.exportKey("jwk", pair.publicKey);
    const header = { typ: "dpop+jwt", alg: "ES256", jwk: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y } };
    const now = host.now ? Math.floor(host.now() / 1e3) : Math.floor(Date.now() / 1e3);
    const payload = { jti: base64Url(randomBytes(host, 12)), htm: method, htu: url, iat: now };
    const signingInput = `${base64Url(bytesFromUtf8(JSON.stringify(header)))}.${base64Url(bytesFromUtf8(JSON.stringify(payload)))}`;
    const signature = new Uint8Array(await cryptoApi.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      pair.privateKey,
      utf8Buffer(signingInput)
    ));
    const jkt = identifier("dpop", { x: jwk.x, y: jwk.y });
    return { proof: `${signingInput}.${base64Url(signature)}`, jkt };
  }
  function randomBytes(host, size) {
    if (host.randomBytes) return host.randomBytes(size);
    const cryptoApi = host.crypto ?? globalThis.crypto;
    const out = new Uint8Array(size);
    cryptoApi.getRandomValues(out);
    return out;
  }
  async function sha256(cryptoApi, value) {
    return new Uint8Array(await cryptoApi.subtle.digest("SHA-256", utf8Buffer(value)));
  }
  function bytesFromUtf8(value) {
    return new Uint8Array(utf8Buffer(value));
  }
  function utf8Buffer(value) {
    const encoded = new TextEncoder().encode(value);
    return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength);
  }
  function base64Url(bytes) {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  }
  async function readJson(response) {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }
  return __toCommonJS(index_exports);
})();
/*! Bundled license information:

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
window.CW_RUNTIME = CW_RUNTIME;
