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
      function __epochIsNumber4(value) {
        return typeof value === "number";
      }
      function __epochIsString6(value) {
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
        if (__epochIsNumber4(target))
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
        if (parsed.type !== "entity" || !__epochIsString6(parsed.id) || !__epochIsString6(parsed.entity) || !__epochIsString6(parsed.author) || !__epochIsNumber4(parsed.lamport) || !isRecord6(parsed.payload)) {
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
        if (__epochIsNumber4(target))
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
        if (!__epochIsString6(value) || value.length === 0)
          throw new Error(`invalid Epoch React ${label}`);
        return value;
      }
      function requireNumber(value, label) {
        if (!__epochIsNumber4(value) || !Number.isFinite(value))
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
    DEFAULT_PROJECT_SLUG: () => DEFAULT_PROJECT_SLUG,
    DEFAULT_STREAM_IGNORE: () => DEFAULT_STREAM_IGNORE,
    EpochCommandError: () => EpochCommandError,
    STREAM_CIPHER_ALPHABET: () => STREAM_CIPHER_ALPHABET,
    STREAM_CIPHER_WIDTH: () => STREAM_CIPHER_WIDTH,
    TRUNK_VIEW: () => TRUNK_VIEW,
    activityFromParticipantEvents: () => activityFromParticipantEvents,
    appendSocialRevision: () => appendSocialRevision,
    beginAtprotoAuthorization: () => beginAtprotoAuthorization,
    cipherToken: () => cipherToken,
    communityRuntimeUsage: () => communityRuntimeUsage,
    composerOwnsLetter: () => composerOwnsLetter,
    createBrowserEpochWorkspace: () => createBrowserEpochWorkspace,
    createCommandReceipt: () => createCommandReceipt,
    createCommunityCommandBus: () => createCommunityCommandBus,
    createCommunityRuntime: () => createCommunityRuntime,
    createStaticHarnessRelease: () => createStaticHarnessRelease,
    createWebMcpTools: () => createWebMcpTools,
    defaultCommunityHarness: () => defaultCommunityHarness,
    describeCatalog: () => describeCatalog,
    describeReceiptBlade: () => describeReceiptBlade,
    diffDynamicUiManifests: () => diffDynamicUiManifests,
    digestOf: () => digestOf,
    ensureProject: () => ensureProject,
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
    isProtectedStreamTarget: () => isProtectedStreamTarget,
    isSpectatorViewPreference: () => isSpectatorViewPreference,
    jumpChooserShouldOpen: () => jumpChooserShouldOpen,
    letterSteersBoard: () => letterSteersBoard,
    listFeeds: () => listFeeds,
    listProjects: () => listProjects,
    normalizeAtprotoHandle: () => normalizeAtprotoHandle,
    openBoardReceipt: () => openBoardReceipt,
    openDurableStorage: () => openDurableStorage,
    parseBoardReceiptLocator: () => parseBoardReceiptLocator,
    parseStreamIgnore: () => parseStreamIgnore,
    parseStreamRewrite: () => parseStreamRewrite,
    pathIsStreamIgnored: () => pathIsStreamIgnored,
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
    function register(descriptor, run) {
      handlers.set(descriptor.kind, { descriptor, run });
    }
    function describe(kind) {
      const handler = handlers.get(kind);
      if (handler === void 0) throw new EpochCommandError("unknown-command", `Unknown Epoch command '${kind}'.`);
      return handler.descriptor;
    }
    function granted(capability) {
      return options.policies.capabilities.includes("*") || options.policies.capabilities.includes(capability);
    }
    function needsConfirmation(descriptor) {
      return descriptor.requiresConfirmation || (options.policies.requireConfirmation ?? []).includes(descriptor.kind);
    }
    async function execute(request) {
      const handler = handlers.get(request.kind);
      if (handler === void 0) {
        throw new EpochCommandError("unknown-command", `Unknown Epoch command '${request.kind}'.`);
      }
      const descriptor = handler.descriptor;
      const input = request.input ?? {};
      sequence += 1;
      const base = {
        kind: descriptor.kind,
        source: request.source ?? options.defaultSource,
        actor: request.actor ?? workspace.actor,
        workspaceId: workspace.id,
        readOnly: descriptor.readOnly,
        sequence,
        timestamp: options.now(),
        input
      };
      if (!granted(descriptor.capability)) {
        return emit(createCommandReceipt({
          ...base,
          policy: policyReceipt("deny", descriptor.capability, `principal lacks capability '${descriptor.capability}'`),
          validation: skippedValidation,
          confirmation: { required: needsConfirmation(descriptor), granted: request.confirmed === true },
          data: { refused: "capability" }
        }));
      }
      if (needsConfirmation(descriptor) && request.confirmed !== true) {
        return emit(createCommandReceipt({
          ...base,
          policy: policyReceipt("confirm", descriptor.capability, `'${descriptor.kind}' requires explicit confirmation`),
          validation: skippedValidation,
          confirmation: { required: true, granted: false },
          data: { refused: "confirmation" }
        }));
      }
      const outcome = handler.run(input);
      return emit(createCommandReceipt({
        ...base,
        policy: policyReceipt("allow", descriptor.capability),
        validation: outcome.validation ?? skippedValidation,
        confirmation: { required: needsConfirmation(descriptor), granted: request.confirmed === true },
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
    "Add --json to print the command receipt verbatim."
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
    return group === "ui" || group === "view";
  }
  function parse(args, runtime) {
    const [group, command, ...rest] = args;
    if (group === "view") return parseViewGroup(command, rest);
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
  function createWebMcpTools(runtime, options = {}) {
    const confirmed = new Set(options.confirmedKinds ?? []);
    return runtime.commands.catalog.map((descriptor) => ({
      name: toolName(descriptor.kind),
      description: descriptor.summary,
      inputSchema: descriptor.inputSchema,
      annotations: {
        readOnlyHint: descriptor.readOnly,
        untrustedContentHint: descriptor.untrustedContent
      },
      execute: async (input) => {
        const receipt = await runtime.commands.execute({
          kind: descriptor.kind,
          input,
          source: options.source ?? "webmcp",
          confirmed: confirmed.has(descriptor.kind)
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

  // packages/Epoch.Community.Runtime/src/board-honesty.ts
  function __epochIsNumber3(value) {
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
    if (status === "working" && !(__epochIsNumber3(heartbeatAt) && now - heartbeatAt < 3e4)) {
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
