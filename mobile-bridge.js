var IRONMobileBundle = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // node_modules/@capacitor/core/dist/index.js
  var ExceptionCode, CapacitorException, getPlatformId, createCapacitor, initCapacitorGlobal, Capacitor, registerPlugin, WebPlugin, encode, decode, CapacitorCookiesPluginWeb, CapacitorCookies, readBlobAsBase64, normalizeHttpHeaders, buildUrlParams, buildRequestInit, CapacitorHttpPluginWeb, CapacitorHttp, SystemBarsStyle, SystemBarType, SystemBarsPluginWeb, SystemBars;
  var init_dist = __esm({
    "node_modules/@capacitor/core/dist/index.js"() {
      (function(ExceptionCode2) {
        ExceptionCode2["Unimplemented"] = "UNIMPLEMENTED";
        ExceptionCode2["Unavailable"] = "UNAVAILABLE";
      })(ExceptionCode || (ExceptionCode = {}));
      CapacitorException = class extends Error {
        constructor(message, code, data) {
          super(message);
          this.message = message;
          this.code = code;
          this.data = data;
        }
      };
      getPlatformId = (win) => {
        var _a, _b;
        if (win === null || win === void 0 ? void 0 : win.androidBridge) {
          return "android";
        } else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) {
          return "ios";
        } else {
          return "web";
        }
      };
      createCapacitor = (win) => {
        const capCustomPlatform = win.CapacitorCustomPlatform || null;
        const cap = win.Capacitor || {};
        const Plugins = cap.Plugins = cap.Plugins || {};
        const getPlatform = () => {
          return capCustomPlatform !== null ? capCustomPlatform.name : getPlatformId(win);
        };
        const isNativePlatform = () => getPlatform() !== "web";
        const isPluginAvailable = (pluginName) => {
          const plugin = registeredPlugins.get(pluginName);
          if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) {
            return true;
          }
          if (getPluginHeader(pluginName)) {
            return true;
          }
          return false;
        };
        const getPluginHeader = (pluginName) => {
          var _a;
          return (_a = cap.PluginHeaders) === null || _a === void 0 ? void 0 : _a.find((h) => h.name === pluginName);
        };
        const handleError = (err) => win.console.error(err);
        const registeredPlugins = /* @__PURE__ */ new Map();
        const registerPlugin2 = (pluginName, jsImplementations = {}) => {
          const registeredPlugin = registeredPlugins.get(pluginName);
          if (registeredPlugin) {
            console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
            return registeredPlugin.proxy;
          }
          const platform = getPlatform();
          const pluginHeader = getPluginHeader(pluginName);
          let jsImplementation;
          const loadPluginImplementation = async () => {
            if (!jsImplementation && platform in jsImplementations) {
              jsImplementation = typeof jsImplementations[platform] === "function" ? jsImplementation = await jsImplementations[platform]() : jsImplementation = jsImplementations[platform];
            } else if (capCustomPlatform !== null && !jsImplementation && "web" in jsImplementations) {
              jsImplementation = typeof jsImplementations["web"] === "function" ? jsImplementation = await jsImplementations["web"]() : jsImplementation = jsImplementations["web"];
            }
            return jsImplementation;
          };
          const createPluginMethod = (impl, prop) => {
            var _a, _b;
            if (pluginHeader) {
              const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find((m) => prop === m.name);
              if (methodHeader) {
                if (methodHeader.rtype === "promise") {
                  return (options) => cap.nativePromise(pluginName, prop.toString(), options);
                } else {
                  return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
                }
              } else if (impl) {
                return (_a = impl[prop]) === null || _a === void 0 ? void 0 : _a.bind(impl);
              }
            } else if (impl) {
              return (_b = impl[prop]) === null || _b === void 0 ? void 0 : _b.bind(impl);
            } else {
              throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform}`, ExceptionCode.Unimplemented);
            }
          };
          const createPluginMethodWrapper = (prop) => {
            let remove;
            const wrapper = (...args) => {
              const p = loadPluginImplementation().then((impl) => {
                const fn = createPluginMethod(impl, prop);
                if (fn) {
                  const p2 = fn(...args);
                  remove = p2 === null || p2 === void 0 ? void 0 : p2.remove;
                  return p2;
                } else {
                  throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform}`, ExceptionCode.Unimplemented);
                }
              });
              if (prop === "addListener") {
                p.remove = async () => remove();
              }
              return p;
            };
            wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
            Object.defineProperty(wrapper, "name", {
              value: prop,
              writable: false,
              configurable: false
            });
            return wrapper;
          };
          const addListener = createPluginMethodWrapper("addListener");
          const removeListener = createPluginMethodWrapper("removeListener");
          const addListenerNative = (eventName, callback) => {
            const call = addListener({ eventName }, callback);
            const remove = async () => {
              const callbackId = await call;
              removeListener({
                eventName,
                callbackId
              }, callback);
            };
            const p = new Promise((resolve) => call.then(() => resolve({ remove })));
            p.remove = async () => {
              console.warn(`Using addListener() without 'await' is deprecated.`);
              await remove();
            };
            return p;
          };
          const proxy = new Proxy({}, {
            get(_, prop) {
              switch (prop) {
                // https://github.com/facebook/react/issues/20030
                case "$$typeof":
                  return void 0;
                case "toJSON":
                  return () => ({});
                case "addListener":
                  return pluginHeader ? addListenerNative : addListener;
                case "removeListener":
                  return removeListener;
                default:
                  return createPluginMethodWrapper(prop);
              }
            }
          });
          Plugins[pluginName] = proxy;
          registeredPlugins.set(pluginName, {
            name: pluginName,
            proxy,
            platforms: /* @__PURE__ */ new Set([...Object.keys(jsImplementations), ...pluginHeader ? [platform] : []])
          });
          return proxy;
        };
        if (!cap.convertFileSrc) {
          cap.convertFileSrc = (filePath) => filePath;
        }
        cap.getPlatform = getPlatform;
        cap.handleError = handleError;
        cap.isNativePlatform = isNativePlatform;
        cap.isPluginAvailable = isPluginAvailable;
        cap.registerPlugin = registerPlugin2;
        cap.Exception = CapacitorException;
        cap.DEBUG = !!cap.DEBUG;
        cap.isLoggingEnabled = !!cap.isLoggingEnabled;
        return cap;
      };
      initCapacitorGlobal = (win) => win.Capacitor = createCapacitor(win);
      Capacitor = /* @__PURE__ */ initCapacitorGlobal(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
      registerPlugin = Capacitor.registerPlugin;
      WebPlugin = class {
        constructor() {
          this.listeners = {};
          this.retainedEventArguments = {};
          this.windowListeners = {};
        }
        addListener(eventName, listenerFunc) {
          let firstListener = false;
          const listeners = this.listeners[eventName];
          if (!listeners) {
            this.listeners[eventName] = [];
            firstListener = true;
          }
          this.listeners[eventName].push(listenerFunc);
          const windowListener = this.windowListeners[eventName];
          if (windowListener && !windowListener.registered) {
            this.addWindowListener(windowListener);
          }
          if (firstListener) {
            this.sendRetainedArgumentsForEvent(eventName);
          }
          const remove = async () => this.removeListener(eventName, listenerFunc);
          const p = Promise.resolve({ remove });
          return p;
        }
        async removeAllListeners() {
          this.listeners = {};
          for (const listener in this.windowListeners) {
            this.removeWindowListener(this.windowListeners[listener]);
          }
          this.windowListeners = {};
        }
        notifyListeners(eventName, data, retainUntilConsumed) {
          const listeners = this.listeners[eventName];
          if (!listeners) {
            if (retainUntilConsumed) {
              let args = this.retainedEventArguments[eventName];
              if (!args) {
                args = [];
              }
              args.push(data);
              this.retainedEventArguments[eventName] = args;
            }
            return;
          }
          listeners.forEach((listener) => listener(data));
        }
        hasListeners(eventName) {
          var _a;
          return !!((_a = this.listeners[eventName]) === null || _a === void 0 ? void 0 : _a.length);
        }
        registerWindowListener(windowEventName, pluginEventName) {
          this.windowListeners[pluginEventName] = {
            registered: false,
            windowEventName,
            pluginEventName,
            handler: (event) => {
              this.notifyListeners(pluginEventName, event);
            }
          };
        }
        unimplemented(msg = "not implemented") {
          return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
        }
        unavailable(msg = "not available") {
          return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
        }
        async removeListener(eventName, listenerFunc) {
          const listeners = this.listeners[eventName];
          if (!listeners) {
            return;
          }
          const index = listeners.indexOf(listenerFunc);
          if (index !== -1) {
            this.listeners[eventName].splice(index, 1);
          }
          if (!this.listeners[eventName].length) {
            this.removeWindowListener(this.windowListeners[eventName]);
          }
        }
        addWindowListener(handle) {
          window.addEventListener(handle.windowEventName, handle.handler);
          handle.registered = true;
        }
        removeWindowListener(handle) {
          if (!handle) {
            return;
          }
          window.removeEventListener(handle.windowEventName, handle.handler);
          handle.registered = false;
        }
        sendRetainedArgumentsForEvent(eventName) {
          const args = this.retainedEventArguments[eventName];
          if (!args) {
            return;
          }
          delete this.retainedEventArguments[eventName];
          args.forEach((arg) => {
            this.notifyListeners(eventName, arg);
          });
        }
      };
      encode = (str) => encodeURIComponent(str).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
      decode = (str) => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
      CapacitorCookiesPluginWeb = class extends WebPlugin {
        async getCookies() {
          const cookies = document.cookie;
          const cookieMap = {};
          cookies.split(";").forEach((cookie) => {
            if (cookie.length <= 0)
              return;
            let [key, value] = cookie.replace(/=/, "CAP_COOKIE").split("CAP_COOKIE");
            key = decode(key).trim();
            value = decode(value).trim();
            cookieMap[key] = value;
          });
          return cookieMap;
        }
        async setCookie(options) {
          try {
            const encodedKey = encode(options.key);
            const encodedValue = encode(options.value);
            const expires = options.expires ? `; expires=${options.expires.replace("expires=", "")}` : "";
            const path = (options.path || "/").replace("path=", "");
            const domain = options.url != null && options.url.length > 0 ? `domain=${options.url}` : "";
            document.cookie = `${encodedKey}=${encodedValue || ""}${expires}; path=${path}; ${domain};`;
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async deleteCookie(options) {
          try {
            document.cookie = `${options.key}=; Max-Age=0`;
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async clearCookies() {
          try {
            const cookies = document.cookie.split(";") || [];
            for (const cookie of cookies) {
              document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${(/* @__PURE__ */ new Date()).toUTCString()};path=/`);
            }
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async clearAllCookies() {
          try {
            await this.clearCookies();
          } catch (error) {
            return Promise.reject(error);
          }
        }
      };
      CapacitorCookies = registerPlugin("CapacitorCookies", {
        web: () => new CapacitorCookiesPluginWeb()
      });
      readBlobAsBase64 = async (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result;
          resolve(base64String.indexOf(",") >= 0 ? base64String.split(",")[1] : base64String);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
      });
      normalizeHttpHeaders = (headers = {}) => {
        const originalKeys = Object.keys(headers);
        const loweredKeys = Object.keys(headers).map((k) => k.toLocaleLowerCase());
        const normalized = loweredKeys.reduce((acc, key, index) => {
          acc[key] = headers[originalKeys[index]];
          return acc;
        }, {});
        return normalized;
      };
      buildUrlParams = (params, shouldEncode = true) => {
        if (!params)
          return null;
        const output = Object.entries(params).reduce((accumulator, entry) => {
          const [key, value] = entry;
          let encodedValue;
          let item;
          if (Array.isArray(value)) {
            item = "";
            value.forEach((str) => {
              encodedValue = shouldEncode ? encodeURIComponent(str) : str;
              item += `${key}=${encodedValue}&`;
            });
            item.slice(0, -1);
          } else {
            encodedValue = shouldEncode ? encodeURIComponent(value) : value;
            item = `${key}=${encodedValue}`;
          }
          return `${accumulator}&${item}`;
        }, "");
        return output.substr(1);
      };
      buildRequestInit = (options, extra = {}) => {
        const output = Object.assign({ method: options.method || "GET", headers: options.headers }, extra);
        const headers = normalizeHttpHeaders(options.headers);
        const type = headers["content-type"] || "";
        if (typeof options.data === "string") {
          output.body = options.data;
        } else if (type.includes("application/x-www-form-urlencoded")) {
          const params = new URLSearchParams();
          for (const [key, value] of Object.entries(options.data || {})) {
            params.set(key, value);
          }
          output.body = params.toString();
        } else if (type.includes("multipart/form-data") || options.data instanceof FormData) {
          const form = new FormData();
          if (options.data instanceof FormData) {
            options.data.forEach((value, key) => {
              form.append(key, value);
            });
          } else {
            for (const key of Object.keys(options.data)) {
              form.append(key, options.data[key]);
            }
          }
          output.body = form;
          const headers2 = new Headers(output.headers);
          headers2.delete("content-type");
          output.headers = headers2;
        } else if (type.includes("application/json") || typeof options.data === "object") {
          output.body = JSON.stringify(options.data);
        }
        return output;
      };
      CapacitorHttpPluginWeb = class extends WebPlugin {
        /**
         * Perform an Http request given a set of options
         * @param options Options to build the HTTP request
         */
        async request(options) {
          const requestInit = buildRequestInit(options, options.webFetchExtra);
          const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
          const url = urlParams ? `${options.url}?${urlParams}` : options.url;
          const response = await fetch(url, requestInit);
          const contentType = response.headers.get("content-type") || "";
          let { responseType = "text" } = response.ok ? options : {};
          if (contentType.includes("application/json")) {
            responseType = "json";
          }
          let data;
          let blob;
          switch (responseType) {
            case "arraybuffer":
            case "blob":
              blob = await response.blob();
              data = await readBlobAsBase64(blob);
              break;
            case "json":
              data = await response.json();
              break;
            case "document":
            case "text":
            default:
              data = await response.text();
          }
          const headers = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });
          return {
            data,
            headers,
            status: response.status,
            url: response.url
          };
        }
        /**
         * Perform an Http GET request given a set of options
         * @param options Options to build the HTTP request
         */
        async get(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "GET" }));
        }
        /**
         * Perform an Http POST request given a set of options
         * @param options Options to build the HTTP request
         */
        async post(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "POST" }));
        }
        /**
         * Perform an Http PUT request given a set of options
         * @param options Options to build the HTTP request
         */
        async put(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "PUT" }));
        }
        /**
         * Perform an Http PATCH request given a set of options
         * @param options Options to build the HTTP request
         */
        async patch(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "PATCH" }));
        }
        /**
         * Perform an Http DELETE request given a set of options
         * @param options Options to build the HTTP request
         */
        async delete(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "DELETE" }));
        }
      };
      CapacitorHttp = registerPlugin("CapacitorHttp", {
        web: () => new CapacitorHttpPluginWeb()
      });
      (function(SystemBarsStyle2) {
        SystemBarsStyle2["Dark"] = "DARK";
        SystemBarsStyle2["Light"] = "LIGHT";
        SystemBarsStyle2["Default"] = "DEFAULT";
      })(SystemBarsStyle || (SystemBarsStyle = {}));
      (function(SystemBarType2) {
        SystemBarType2["StatusBar"] = "StatusBar";
        SystemBarType2["NavigationBar"] = "NavigationBar";
      })(SystemBarType || (SystemBarType = {}));
      SystemBarsPluginWeb = class extends WebPlugin {
        async setStyle() {
          this.unavailable("not available for web");
        }
        async setAnimation() {
          this.unavailable("not available for web");
        }
        async show() {
          this.unavailable("not available for web");
        }
        async hide() {
          this.unavailable("not available for web");
        }
      };
      SystemBars = registerPlugin("SystemBars", {
        web: () => new SystemBarsPluginWeb()
      });
    }
  });

  // node_modules/@capacitor/local-notifications/dist/esm/web.js
  var web_exports = {};
  __export(web_exports, {
    LocalNotificationsWeb: () => LocalNotificationsWeb
  });
  var LocalNotificationsWeb;
  var init_web = __esm({
    "node_modules/@capacitor/local-notifications/dist/esm/web.js"() {
      init_dist();
      LocalNotificationsWeb = class extends WebPlugin {
        constructor() {
          super(...arguments);
          this.pending = [];
          this.deliveredNotifications = [];
          this.hasNotificationSupport = () => {
            if (!("Notification" in window) || !Notification.requestPermission) {
              return false;
            }
            if (Notification.permission !== "granted") {
              try {
                new Notification("");
              } catch (e) {
                if (e instanceof Error && e.name === "TypeError") {
                  return false;
                }
              }
            }
            return true;
          };
        }
        async getDeliveredNotifications() {
          const deliveredSchemas = [];
          for (const notification of this.deliveredNotifications) {
            const deliveredSchema = {
              title: notification.title,
              id: parseInt(notification.tag),
              body: notification.body
            };
            deliveredSchemas.push(deliveredSchema);
          }
          return {
            notifications: deliveredSchemas
          };
        }
        async removeDeliveredNotifications(delivered) {
          for (const toRemove of delivered.notifications) {
            const found = this.deliveredNotifications.find((n) => n.tag === String(toRemove.id));
            found === null || found === void 0 ? void 0 : found.close();
            this.deliveredNotifications = this.deliveredNotifications.filter(() => !found);
          }
        }
        async removeDeliveredNotificationsById(options) {
          for (const id of options.ids) {
            const found = this.deliveredNotifications.find((n) => n.tag === String(id));
            found === null || found === void 0 ? void 0 : found.close();
            this.deliveredNotifications = this.deliveredNotifications.filter((n) => n !== found);
          }
        }
        async removeAllDeliveredNotifications() {
          for (const notification of this.deliveredNotifications) {
            notification.close();
          }
          this.deliveredNotifications = [];
        }
        async getByIds(options) {
          const ids = options.ids.map((id) => String(id));
          const scheduled = this.pending.filter((n) => ids.includes(String(n.id)));
          const delivered = this.deliveredNotifications.filter((n) => ids.includes(n.tag)).map((n) => this.deliveredToSchema(n));
          return { notifications: [...scheduled, ...delivered] };
        }
        async getAll(options) {
          const scheduled = [...this.pending];
          const delivered = this.deliveredNotifications.map((n) => this.deliveredToSchema(n));
          if ((options === null || options === void 0 ? void 0 : options.state) === "SCHEDULED") {
            return { notifications: scheduled };
          }
          if ((options === null || options === void 0 ? void 0 : options.state) === "TRIGGERED") {
            return { notifications: delivered };
          }
          return { notifications: [...scheduled, ...delivered] };
        }
        deliveredToSchema(notification) {
          return {
            title: notification.title,
            id: parseInt(notification.tag),
            body: notification.body
          };
        }
        async createChannel() {
          throw this.unimplemented("Not implemented on web.");
        }
        async deleteChannel() {
          throw this.unimplemented("Not implemented on web.");
        }
        async listChannels() {
          throw this.unimplemented("Not implemented on web.");
        }
        async schedule(options) {
          if (!this.hasNotificationSupport()) {
            throw this.unavailable("Notifications not supported in this browser.");
          }
          for (const notification of options.notifications) {
            this.sendNotification(notification);
          }
          return {
            notifications: options.notifications.map((notification) => ({
              id: notification.id
            }))
          };
        }
        async update(options) {
          if (!this.hasNotificationSupport()) {
            throw this.unavailable("Notifications not supported in this browser.");
          }
          const updated = [];
          for (const notification of options.notifications) {
            const index = this.pending.findIndex((n) => n.id === notification.id);
            if (index === -1) {
              continue;
            }
            this.pending.splice(index, 1);
            this.sendNotification(notification);
            updated.push(notification);
          }
          return {
            notifications: updated.map((notification) => ({ id: notification.id }))
          };
        }
        async getPending() {
          return {
            notifications: this.pending
          };
        }
        async cancelAll() {
          this.pending = [];
        }
        async registerActionTypes() {
          throw this.unimplemented("Not implemented on web.");
        }
        async cancel(pending) {
          this.pending = this.pending.filter((notification) => !pending.notifications.find((n) => n.id === notification.id));
        }
        async areEnabled() {
          const { display } = await this.checkPermissions();
          return {
            value: display === "granted"
          };
        }
        async changeExactNotificationSetting() {
          throw this.unimplemented("Not implemented on web.");
        }
        async checkExactNotificationSetting() {
          throw this.unimplemented("Not implemented on web.");
        }
        async requestPermissions() {
          if (!this.hasNotificationSupport()) {
            throw this.unavailable("Notifications not supported in this browser.");
          }
          const display = this.transformNotificationPermission(await Notification.requestPermission());
          return { display };
        }
        async checkPermissions() {
          if (!this.hasNotificationSupport()) {
            throw this.unavailable("Notifications not supported in this browser.");
          }
          const display = this.transformNotificationPermission(Notification.permission);
          return { display };
        }
        transformNotificationPermission(permission) {
          switch (permission) {
            case "granted":
              return "granted";
            case "denied":
              return "denied";
            default:
              return "prompt";
          }
        }
        sendPending() {
          var _a;
          const toRemove = [];
          const now = (/* @__PURE__ */ new Date()).getTime();
          for (const notification of this.pending) {
            if (((_a = notification.schedule) === null || _a === void 0 ? void 0 : _a.at) && notification.schedule.at.getTime() <= now) {
              this.buildNotification(notification);
              toRemove.push(notification);
            }
          }
          this.pending = this.pending.filter((notification) => !toRemove.find((n) => n === notification));
        }
        sendNotification(notification) {
          var _a;
          if ((_a = notification.schedule) === null || _a === void 0 ? void 0 : _a.at) {
            const diff = notification.schedule.at.getTime() - (/* @__PURE__ */ new Date()).getTime();
            this.pending.push(notification);
            setTimeout(() => {
              this.sendPending();
            }, diff);
            return;
          }
          this.buildNotification(notification);
        }
        buildNotification(notification) {
          const localNotification = new Notification(notification.title, {
            body: notification.body,
            tag: String(notification.id)
          });
          localNotification.addEventListener("click", this.onClick.bind(this, notification), false);
          localNotification.addEventListener("show", this.onShow.bind(this, notification), false);
          localNotification.addEventListener("close", () => {
            this.deliveredNotifications = this.deliveredNotifications.filter(() => !this);
          }, false);
          this.deliveredNotifications.push(localNotification);
          return localNotification;
        }
        onClick(notification) {
          const data = {
            actionId: "tap",
            notification
          };
          this.notifyListeners("localNotificationActionPerformed", data);
        }
        onShow(notification) {
          this.notifyListeners("localNotificationReceived", notification);
        }
      };
    }
  });

  // node_modules/@capacitor/app/dist/esm/web.js
  var web_exports2 = {};
  __export(web_exports2, {
    AppWeb: () => AppWeb
  });
  var AppWeb;
  var init_web2 = __esm({
    "node_modules/@capacitor/app/dist/esm/web.js"() {
      init_dist();
      AppWeb = class extends WebPlugin {
        constructor() {
          super();
          this.handleVisibilityChange = () => {
            const data = {
              isActive: document.hidden !== true
            };
            this.notifyListeners("appStateChange", data);
            if (document.hidden) {
              this.notifyListeners("pause", null);
            } else {
              this.notifyListeners("resume", null);
            }
          };
          document.addEventListener("visibilitychange", this.handleVisibilityChange, false);
        }
        exitApp() {
          throw this.unimplemented("Not implemented on web.");
        }
        async getInfo() {
          throw this.unimplemented("Not implemented on web.");
        }
        async getLaunchUrl() {
          return { url: "" };
        }
        async getState() {
          return { isActive: document.hidden !== true };
        }
        async minimizeApp() {
          throw this.unimplemented("Not implemented on web.");
        }
        async toggleBackButtonHandler() {
          throw this.unimplemented("Not implemented on web.");
        }
        async getAppLanguage() {
          return {
            value: navigator.language.split("-")[0].toLowerCase()
          };
        }
      };
    }
  });

  // node_modules/@capgo/capacitor-speech-recognition/dist/esm/web.js
  var web_exports3 = {};
  __export(web_exports3, {
    SpeechRecognitionWeb: () => SpeechRecognitionWeb
  });
  var SpeechRecognitionWeb;
  var init_web3 = __esm({
    "node_modules/@capgo/capacitor-speech-recognition/dist/esm/web.js"() {
      init_dist();
      SpeechRecognitionWeb = class extends WebPlugin {
        available() {
          throw this.unimplemented("Speech recognition is not available on the web.");
        }
        async isOnDeviceRecognitionAvailable() {
          return { available: false };
        }
        start(_options) {
          throw this.unimplemented("Speech recognition is not available on the web.");
        }
        stop() {
          throw this.unimplemented("Speech recognition is not available on the web.");
        }
        forceStop(_options) {
          throw this.unimplemented("Speech recognition is not available on the web.");
        }
        async getLastPartialResult() {
          return { available: false, text: "" };
        }
        setPTTState(_options) {
          throw this.unimplemented("Speech recognition is not available on the web.");
        }
        getSupportedLanguages() {
          throw this.unimplemented("Speech recognition is not available on the web.");
        }
        isListening() {
          throw this.unimplemented("Speech recognition is not available on the web.");
        }
        checkPermissions() {
          throw this.unimplemented("Speech recognition permissions are not handled on the web.");
        }
        requestPermissions() {
          throw this.unimplemented("Speech recognition permissions are not handled on the web.");
        }
        async getPluginVersion() {
          return { version: "web" };
        }
      };
    }
  });

  // src/mobile.js
  init_dist();

  // node_modules/@capacitor/local-notifications/dist/esm/index.js
  init_dist();

  // node_modules/@capacitor/local-notifications/dist/esm/definitions.js
  var Weekday;
  (function(Weekday2) {
    Weekday2[Weekday2["Sunday"] = 1] = "Sunday";
    Weekday2[Weekday2["Monday"] = 2] = "Monday";
    Weekday2[Weekday2["Tuesday"] = 3] = "Tuesday";
    Weekday2[Weekday2["Wednesday"] = 4] = "Wednesday";
    Weekday2[Weekday2["Thursday"] = 5] = "Thursday";
    Weekday2[Weekday2["Friday"] = 6] = "Friday";
    Weekday2[Weekday2["Saturday"] = 7] = "Saturday";
  })(Weekday || (Weekday = {}));

  // node_modules/@capacitor/local-notifications/dist/esm/index.js
  var LocalNotifications = registerPlugin("LocalNotifications", {
    web: () => Promise.resolve().then(() => (init_web(), web_exports)).then((m) => new m.LocalNotificationsWeb())
  });

  // node_modules/@capacitor/app/dist/esm/index.js
  init_dist();
  var App = registerPlugin("App", {
    web: () => Promise.resolve().then(() => (init_web2(), web_exports2)).then((m) => new m.AppWeb())
  });

  // node_modules/@capacitor/camera/dist/esm/index.js
  init_dist();

  // node_modules/@capacitor/camera/dist/esm/web.js
  init_dist();

  // node_modules/@capacitor/camera/dist/esm/definitions.js
  var CameraSource;
  (function(CameraSource2) {
    CameraSource2["Prompt"] = "PROMPT";
    CameraSource2["Camera"] = "CAMERA";
    CameraSource2["Photos"] = "PHOTOS";
  })(CameraSource || (CameraSource = {}));
  var CameraDirection;
  (function(CameraDirection2) {
    CameraDirection2["Rear"] = "REAR";
    CameraDirection2["Front"] = "FRONT";
  })(CameraDirection || (CameraDirection = {}));
  var CameraResultType;
  (function(CameraResultType2) {
    CameraResultType2["Uri"] = "uri";
    CameraResultType2["Base64"] = "base64";
    CameraResultType2["DataUrl"] = "dataUrl";
  })(CameraResultType || (CameraResultType = {}));
  var MediaType;
  (function(MediaType2) {
    MediaType2[MediaType2["Photo"] = 0] = "Photo";
    MediaType2[MediaType2["Video"] = 1] = "Video";
  })(MediaType || (MediaType = {}));
  var MediaTypeSelection;
  (function(MediaTypeSelection2) {
    MediaTypeSelection2[MediaTypeSelection2["Photo"] = 0] = "Photo";
    MediaTypeSelection2[MediaTypeSelection2["Video"] = 1] = "Video";
    MediaTypeSelection2[MediaTypeSelection2["All"] = 2] = "All";
  })(MediaTypeSelection || (MediaTypeSelection = {}));
  var EncodingType;
  (function(EncodingType2) {
    EncodingType2[EncodingType2["JPEG"] = 0] = "JPEG";
    EncodingType2[EncodingType2["PNG"] = 1] = "PNG";
  })(EncodingType || (EncodingType = {}));
  var CameraErrorCode;
  (function(CameraErrorCode2) {
    CameraErrorCode2["CameraPermissionDenied"] = "OS-PLUG-CAMR-0003";
    CameraErrorCode2["GalleryPermissionDenied"] = "OS-PLUG-CAMR-0005";
    CameraErrorCode2["NoCameraAvailable"] = "OS-PLUG-CAMR-0007";
    CameraErrorCode2["TakePhotoCancelled"] = "OS-PLUG-CAMR-0006";
    CameraErrorCode2["TakePhotoFailed"] = "OS-PLUG-CAMR-0010";
    CameraErrorCode2["TakePhotoInvalidArguments"] = "OS-PLUG-CAMR-0014";
    CameraErrorCode2["InvalidImageData"] = "OS-PLUG-CAMR-0008";
    CameraErrorCode2["EditPhotoFailed"] = "OS-PLUG-CAMR-0009";
    CameraErrorCode2["EditPhotoCancelled"] = "OS-PLUG-CAMR-0013";
    CameraErrorCode2["EditPhotoEmptyUri"] = "OS-PLUG-CAMR-0024";
    CameraErrorCode2["ImageNotFound"] = "OS-PLUG-CAMR-0011";
    CameraErrorCode2["ProcessImageFailed"] = "OS-PLUG-CAMR-0012";
    CameraErrorCode2["ChooseMediaFailed"] = "OS-PLUG-CAMR-0018";
    CameraErrorCode2["ChooseMediaCancelled"] = "OS-PLUG-CAMR-0020";
    CameraErrorCode2["MediaPathError"] = "OS-PLUG-CAMR-0021";
    CameraErrorCode2["FetchImageFromUriFailed"] = "OS-PLUG-CAMR-0028";
    CameraErrorCode2["RecordVideoFailed"] = "OS-PLUG-CAMR-0016";
    CameraErrorCode2["RecordVideoCancelled"] = "OS-PLUG-CAMR-0017";
    CameraErrorCode2["VideoNotFound"] = "OS-PLUG-CAMR-0025";
    CameraErrorCode2["PlayVideoFailed"] = "OS-PLUG-CAMR-0023";
    CameraErrorCode2["EncodeResultFailed"] = "OS-PLUG-CAMR-0019";
    CameraErrorCode2["FileNotFound"] = "OS-PLUG-CAMR-0027";
    CameraErrorCode2["InvalidArgument"] = "OS-PLUG-CAMR-0031";
    CameraErrorCode2["GeneralError"] = "OS-PLUG-CAMR-0026";
  })(CameraErrorCode || (CameraErrorCode = {}));

  // node_modules/@capacitor/camera/dist/esm/web.js
  var CameraWeb = class extends WebPlugin {
    async takePhoto(options) {
      return new Promise(async (resolve, reject) => {
        if (options.webUseInput) {
          this.takePhotoCameraInputExperience(options, resolve, reject);
        } else {
          this.takePhotoCameraExperience(options, resolve, reject);
        }
      });
    }
    async recordVideo(_options) {
      throw this.unimplemented("recordVideo is not implemented on Web.");
    }
    async playVideo(_options) {
      throw this.unimplemented("playVideo is not implemented on Web.");
    }
    async chooseFromGallery(options) {
      return new Promise(async (resolve, reject) => {
        this.galleryInputExperience(options, resolve, reject);
      });
    }
    async editPhoto(_options) {
      throw this.unimplemented("editPhoto is not implemented on Web.");
    }
    async editURIPhoto(_options) {
      throw this.unimplemented("editURIPhoto is not implemented on Web.");
    }
    async getPhoto(options) {
      return new Promise(async (resolve, reject) => {
        if (options.webUseInput || options.source === CameraSource.Photos) {
          this.fileInputExperience(options, resolve, reject);
        } else if (options.source === CameraSource.Prompt) {
          let actionSheet = document.querySelector("pwa-action-sheet");
          if (!actionSheet) {
            actionSheet = document.createElement("pwa-action-sheet");
            document.body.appendChild(actionSheet);
          }
          actionSheet.header = options.promptLabelHeader || "Photo";
          actionSheet.cancelable = false;
          actionSheet.options = [
            { title: options.promptLabelPhoto || "From Photos" },
            { title: options.promptLabelPicture || "Take Picture" }
          ];
          actionSheet.addEventListener("onSelection", async (e) => {
            const selection = e.detail;
            if (selection === 0) {
              this.fileInputExperience(options, resolve, reject);
            } else {
              this.cameraExperience(options, resolve, reject);
            }
          });
        } else {
          this.cameraExperience(options, resolve, reject);
        }
      });
    }
    async pickImages(_options) {
      return new Promise(async (resolve, reject) => {
        this.multipleFileInputExperience(resolve, reject);
      });
    }
    async cameraExperience(options, resolve, reject) {
      await this._setupPWACameraModal(options.direction, (photo) => this._getCameraPhoto(photo, options), () => this.fileInputExperience(options, resolve, reject), resolve, reject);
    }
    fileInputExperience(options, resolve, reject) {
      let input = document.querySelector("#_capacitor-camera-input");
      const cleanup = () => {
        var _a;
        (_a = input.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(input);
      };
      if (!input) {
        input = document.createElement("input");
        input.id = "_capacitor-camera-input";
        input.type = "file";
        input.hidden = true;
        document.body.appendChild(input);
        input.addEventListener("change", (_e) => {
          const file = input.files[0];
          let format = "jpeg";
          if (file.type === "image/png") {
            format = "png";
          } else if (file.type === "image/gif") {
            format = "gif";
          }
          if (options.resultType === "dataUrl" || options.resultType === "base64") {
            const reader = new FileReader();
            reader.addEventListener("load", () => {
              if (options.resultType === "dataUrl") {
                resolve({
                  dataUrl: reader.result,
                  format
                });
              } else if (options.resultType === "base64") {
                const b64 = reader.result.split(",")[1];
                resolve({
                  base64String: b64,
                  format
                });
              }
              cleanup();
            });
            reader.readAsDataURL(file);
          } else {
            resolve({
              webPath: URL.createObjectURL(file),
              format
            });
            cleanup();
          }
        });
        input.addEventListener("cancel", (_e) => {
          reject(new CapacitorException("User cancelled photos app"));
          cleanup();
        });
      }
      input.accept = "image/*";
      input.capture = true;
      if (options.source === CameraSource.Photos || options.source === CameraSource.Prompt) {
        input.removeAttribute("capture");
      } else if (options.direction === CameraDirection.Front) {
        input.capture = "user";
      } else if (options.direction === CameraDirection.Rear) {
        input.capture = "environment";
      }
      input.click();
    }
    multipleFileInputExperience(resolve, reject) {
      let input = document.querySelector("#_capacitor-camera-input-multiple");
      const cleanup = () => {
        var _a;
        (_a = input.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(input);
      };
      if (!input) {
        input = document.createElement("input");
        input.id = "_capacitor-camera-input-multiple";
        input.type = "file";
        input.hidden = true;
        input.multiple = true;
        document.body.appendChild(input);
        input.addEventListener("change", (_e) => {
          const photos = [];
          for (let i = 0; i < input.files.length; i++) {
            const file = input.files[i];
            let format = "jpeg";
            if (file.type === "image/png") {
              format = "png";
            } else if (file.type === "image/gif") {
              format = "gif";
            }
            photos.push({
              webPath: URL.createObjectURL(file),
              format
            });
          }
          resolve({ photos });
          cleanup();
        });
        input.addEventListener("cancel", (_e) => {
          reject(new CapacitorException("User cancelled photos app"));
          cleanup();
        });
      }
      input.accept = "image/*";
      input.click();
    }
    _getCameraPhoto(photo, options) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const format = this._getFileFormat(photo);
        if (options.resultType === "uri") {
          resolve({
            webPath: URL.createObjectURL(photo),
            format,
            saved: false
          });
        } else {
          reader.readAsDataURL(photo);
          reader.onloadend = () => {
            const r = reader.result;
            if (options.resultType === "dataUrl") {
              resolve({
                dataUrl: r,
                format,
                saved: false
              });
            } else {
              resolve({
                base64String: r.split(",")[1],
                format,
                saved: false
              });
            }
          };
          reader.onerror = (e) => {
            reject(e);
          };
        }
      });
    }
    async takePhotoCameraExperience(options, resolve, reject) {
      await this._setupPWACameraModal(options.cameraDirection, (photo) => {
        var _a;
        return this._buildPhotoMediaResult(photo, (_a = options.includeMetadata) !== null && _a !== void 0 ? _a : false);
      }, () => this.takePhotoCameraInputExperience(options, resolve, reject), resolve, reject);
    }
    takePhotoCameraInputExperience(options, resolve, reject) {
      const input = this._createFileInput("_capacitor-camera-input-takephoto");
      const cleanup = () => {
        var _a;
        (_a = input.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(input);
      };
      input.onchange = async (_e) => {
        var _a;
        if (!this._validateFileInput(input, reject, cleanup)) {
          return;
        }
        const file = input.files[0];
        resolve(await this._buildPhotoMediaResult(file, (_a = options.includeMetadata) !== null && _a !== void 0 ? _a : false));
        cleanup();
      };
      input.oncancel = () => {
        reject(new CapacitorException("User cancelled photos app"));
        cleanup();
      };
      input.accept = "image/*";
      if (options.cameraDirection === CameraDirection.Front) {
        input.capture = "user";
      } else {
        input.capture = "environment";
      }
      input.click();
    }
    galleryInputExperience(options, resolve, reject) {
      var _a, _b;
      const input = this._createFileInput("_capacitor-camera-input-gallery");
      input.multiple = (_a = options.allowMultipleSelection) !== null && _a !== void 0 ? _a : false;
      const cleanup = () => {
        var _a2;
        (_a2 = input.parentNode) === null || _a2 === void 0 ? void 0 : _a2.removeChild(input);
      };
      input.onchange = async (_e) => {
        var _a2;
        if (!this._validateFileInput(input, reject, cleanup)) {
          return;
        }
        const results = [];
        for (let i = 0; i < input.files.length; i++) {
          const file = input.files[i];
          if (file.type.startsWith("image/")) {
            results.push(await this._buildPhotoMediaResult(file, (_a2 = options.includeMetadata) !== null && _a2 !== void 0 ? _a2 : false));
          } else if (file.type.startsWith("video/")) {
            const format = this._getFileFormat(file);
            let thumbnail;
            let resolution;
            let duration;
            try {
              const videoInfo = await this._getVideoMetadata(file);
              thumbnail = videoInfo.thumbnail;
              if (options.includeMetadata) {
                resolution = videoInfo.resolution;
                duration = videoInfo.duration;
              }
            } catch (e) {
              console.warn("Failed to get video metadata:", e);
            }
            const result = {
              type: MediaType.Video,
              thumbnail,
              webPath: URL.createObjectURL(file),
              saved: false
            };
            if (options.includeMetadata) {
              result.metadata = {
                format,
                resolution,
                size: file.size,
                creationDate: new Date(file.lastModified).toISOString(),
                duration
              };
            }
            results.push(result);
          }
        }
        resolve({ results });
        cleanup();
      };
      input.oncancel = () => {
        reject(new CapacitorException("User cancelled photos app"));
        cleanup();
      };
      const mediaType = (_b = options.mediaType) !== null && _b !== void 0 ? _b : MediaTypeSelection.Photo;
      if (mediaType === MediaTypeSelection.Photo) {
        input.accept = "image/*";
      } else if (mediaType === MediaTypeSelection.Video) {
        input.accept = "video/*";
      } else {
        input.accept = "image/*,video/*";
      }
      input.click();
    }
    _getFileFormat(file) {
      if (file.type === "image/png") {
        return "png";
      } else if (file.type === "image/gif") {
        return "gif";
      } else if (file.type.startsWith("video/")) {
        return file.type.split("/")[1];
      } else if (file.type.startsWith("image/")) {
        return "jpeg";
      }
      return file.type.split("/")[1] || "jpeg";
    }
    async _buildPhotoMediaResult(file, includeMetadata) {
      const format = this._getFileFormat(file);
      const thumbnail = await this._getBase64FromFile(file);
      const result = {
        type: MediaType.Photo,
        thumbnail,
        webPath: URL.createObjectURL(file),
        saved: false
      };
      if (includeMetadata) {
        const resolution = await this._getImageResolution(file);
        result.metadata = {
          format,
          resolution,
          size: file.size,
          creationDate: "lastModified" in file ? new Date(file.lastModified).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      return result;
    }
    _validateFileInput(input, reject, cleanup) {
      if (!input.files || input.files.length === 0) {
        const message = input.multiple ? "No files selected" : "No file selected";
        reject(new CapacitorException(message));
        cleanup();
        return false;
      }
      return true;
    }
    async _setupPWACameraModal(cameraDirection, onPhotoCallback, fallbackCallback, resolve, reject) {
      if (customElements.get("pwa-camera-modal")) {
        const cameraModal = document.createElement("pwa-camera-modal");
        cameraModal.facingMode = cameraDirection === CameraDirection.Front ? "user" : "environment";
        document.body.appendChild(cameraModal);
        try {
          await cameraModal.componentOnReady();
          cameraModal.addEventListener("onPhoto", async (e) => {
            const photo = e.detail;
            if (photo === null) {
              reject(new CapacitorException("User cancelled photos app"));
            } else if (photo instanceof Error) {
              reject(photo);
            } else {
              resolve(await onPhotoCallback(photo));
            }
            cameraModal.dismiss();
            document.body.removeChild(cameraModal);
          });
          cameraModal.present();
        } catch (e) {
          fallbackCallback();
        }
      } else {
        console.error(`Unable to load PWA Element 'pwa-camera-modal'. See the docs: https://capacitorjs.com/docs/web/pwa-elements.`);
        fallbackCallback();
      }
    }
    _createFileInput(id) {
      let input = document.querySelector(`#${id}`);
      if (!input) {
        input = document.createElement("input");
        input.id = id;
        input.type = "file";
        input.hidden = true;
        document.body.appendChild(input);
      }
      return input;
    }
    async _getImageResolution(image) {
      try {
        const bitmap = await createImageBitmap(image);
        const resolution = `${bitmap.width}x${bitmap.height}`;
        bitmap.close();
        return resolution;
      } catch (e) {
        console.warn("Failed to get image resolution:", e);
        return void 0;
      }
    }
    _getBase64FromFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result;
          const base64 = dataUrl.split(",")[1];
          resolve(base64);
        };
        reader.onerror = (e) => {
          reject(e);
        };
        reader.readAsDataURL(file);
      });
    }
    _getVideoMetadata(videoFile) {
      return new Promise((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.onloadedmetadata = () => {
          const seekTime = Math.min(1, video.duration * 0.1);
          video.currentTime = seekTime;
        };
        video.onseeked = () => {
          const result = {
            resolution: `${video.videoWidth}x${video.videoHeight}`,
            duration: video.duration
          };
          try {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              result.thumbnail = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
            }
          } catch (e) {
            console.warn("Failed to generate video thumbnail:", e);
          }
          URL.revokeObjectURL(video.src);
          resolve(result);
        };
        video.onerror = () => {
          URL.revokeObjectURL(video.src);
          resolve({});
        };
        video.src = URL.createObjectURL(videoFile);
      });
    }
    async checkPermissions() {
      if (typeof navigator === "undefined" || !navigator.permissions) {
        throw this.unavailable("Permissions API not available in this browser");
      }
      try {
        const permission = await window.navigator.permissions.query({
          name: "camera"
        });
        return {
          camera: permission.state,
          photos: "granted"
        };
      } catch (_a) {
        throw this.unavailable("Camera permissions are not available in this browser");
      }
    }
    async requestPermissions() {
      throw this.unimplemented("Not implemented on web.");
    }
    async pickLimitedLibraryPhotos() {
      throw this.unavailable("Not implemented on web.");
    }
    async getLimitedLibraryPhotos() {
      throw this.unavailable("Not implemented on web.");
    }
  };
  var Camera = new CameraWeb();

  // node_modules/@capacitor/camera/dist/esm/index.js
  var Camera2 = registerPlugin("Camera", {
    web: () => new CameraWeb()
  });

  // node_modules/@capgo/capacitor-speech-recognition/dist/esm/index.js
  init_dist();
  var SpeechRecognition = registerPlugin("SpeechRecognition", {
    web: () => Promise.resolve().then(() => (init_web3(), web_exports3)).then((m) => new m.SpeechRecognitionWeb())
  });

  // src/mobile.js
  console.log("[IRON] Android V6 Core Integration geladen");
  var IronPhone = registerPlugin("IronPhone");
  var IronCalendar = registerPlugin("IronCalendar");
  var state = {
    native: Capacitor.isNativePlatform()
  };
  function log(...args) {
    console.log("[IRON Mobile]", ...args);
  }
  var CLOUD_BASE = "https://starter-function-4j4o.fra.appwrite.run";
  var activeAudio = null;
  var conversationMode = false;
  var conversationBusy = false;
  function cleanSpeechText(value) {
    return String(value ?? "").replace(/https?:\/\/\S+/gi, " Link ").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ").replace(/[*_#>`~|•▪◦●○■□✓✔☐☑→←↑↓]+/g, " ").replace(/[,:;()[\]{}"“”„'’…\/\\]+/g, " ").replace(/\s*[-–—]\s*/g, " ").replace(/\s+/g, " ").trim();
  }
  async function speak(text) {
    text = cleanSpeechText(text);
    if (!text) return;
    window.ironSetActivity?.("thinking");
    try {
      const response = await fetch(`${CLOUD_BASE}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      let data = null;
      try {
        data = await response.json();
      } catch {
      }
      if (!response.ok || !data?.ok || !data?.audio_base64) {
        throw new Error(data?.error || `Cloud Voice HTTP ${response.status}`);
      }
      if (activeAudio) {
        try {
          activeAudio.pause();
        } catch {
        }
        activeAudio = null;
      }
      const audio = new Audio(`data:${data.mime_type || "audio/mpeg"};base64,${data.audio_base64}`);
      activeAudio = audio;
      window.ironSetActivity?.("speaking");
      await new Promise((resolve, reject) => {
        audio.onended = resolve;
        audio.onerror = () => reject(new Error("IRON Cloud Voice konnte nicht abgespielt werden."));
        audio.play().catch(reject);
      });
    } catch (error) {
      console.error("[IRON CLOUD VOICE]", error);
      window.dispatchEvent(new CustomEvent("iron-cloud-voice-error", {
        detail: { message: String(error?.message || error) }
      }));
    } finally {
      activeAudio = null;
      window.ironSetActivity?.("ready");
    }
  }
  async function stopSpeaking() {
    if (activeAudio) {
      try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
      } catch {
      }
      activeAudio = null;
    }
  }
  async function runConversationTurn() {
    if (!conversationMode || conversationBusy) return;
    conversationBusy = true;
    try {
      const text = await listenOnce();
      if (text && typeof window.command === "function") {
        await window.command(text);
        if (window.__ironLastSpeechPromise) await window.__ironLastSpeechPromise.catch(() => {
        });
      }
    } catch (e) {
      console.warn("[IRON Mobile] conversation:", e);
    } finally {
      conversationBusy = false;
      if (conversationMode) setTimeout(runConversationTurn, 700);
    }
  }
  function startConversation() {
    conversationMode = true;
    runConversationTurn();
    return true;
  }
  async function stopConversation() {
    conversationMode = false;
    await stopSpeaking();
    return true;
  }
  async function requestNotifications() {
    try {
      const current = await LocalNotifications.checkPermissions();
      if (current.display !== "granted") {
        return await LocalNotifications.requestPermissions();
      }
      return current;
    } catch (e) {
      console.warn("[IRON Mobile] notifications:", e);
      return null;
    }
  }
  async function scheduleNotification({ title = "IRON TASK", body = "Task-Erinnerung", at, id } = {}) {
    const perm = await requestNotifications();
    if (perm?.display !== "granted") {
      throw new Error("Benachrichtigungen wurden nicht erlaubt.");
    }
    const when = at instanceof Date ? at : new Date(at || Date.now() + 6e4);
    if (Number.isNaN(when.getTime())) throw new Error("Ung\xFCltiger Zeitpunkt.");
    const notificationId = Number.isInteger(id) ? id : Math.floor(Date.now() / 1e3) % 2147483e3;
    await LocalNotifications.schedule({
      notifications: [{
        id: notificationId,
        title,
        body,
        schedule: { at: when, allowWhileIdle: true },
        extra: { source: "IRON" }
      }]
    });
    return { id: notificationId, at: when.toISOString() };
  }
  async function listenOnce() {
    window.ironSetActivity?.("listening");
    let p = await SpeechRecognition.checkPermissions();
    if (p?.speechRecognition !== "granted") p = await SpeechRecognition.requestPermissions();
    if (p?.speechRecognition !== "granted") throw new Error("Spracherkennung wurde nicht erlaubt.");
    const available = await SpeechRecognition.available();
    if (!available?.available) throw new Error("Android-Spracherkennung ist nicht verf\xFCgbar.");
    try {
      const result = await SpeechRecognition.start({
        language: "de-DE",
        maxResults: 5,
        partialResults: false,
        popup: true
      });
      return String((result?.matches || []).find(Boolean) || "").trim();
    } catch (e) {
      const msg = String(e?.message || e || "").toLowerCase();
      if (msg.includes("no match") || msg.includes("nomatch")) return "";
      throw e;
    } finally {
      window.ironSetActivity?.("ready");
    }
  }
  var pairedSmsUser = "";
  var smsPollBusy = false;
  async function cloudSms(path, payload = {}) {
    const cloud = window.IRONCloud;
    const user = await cloud?.currentUser();
    if (!user) throw new Error("Bitte mit dem IRON-Konto anmelden.");
    const token = await cloud.account.createJWT();
    const response = await fetch(`${cloud.cfg.functionDomain}/api/sms/${path}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({ ...payload, userJwt: token.jwt })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || `SMS HTTP ${response.status}`);
    return data;
  }
  function decodeSmsCommand(command) {
    const parts = String(command).split("::");
    const version = parts[0];
    if (!(version === "SMS" && parts.length === 4 || version === "SMSV2" && parts.length === 5)) throw new Error("Ung\xFCltiger SMS-Auftrag.");
    const slot = Number(parts[1]), number = version === "SMS" ? parts[2] : parts[3];
    if (!/^[+]?\d{5,18}$/.test(number) || ![1, 2].includes(slot)) throw new Error("SMS-Ziel oder SIM nicht unterst\xFCtzt.");
    const encoded = parts[parts.length - 1];
    if (!/^[A-Za-z0-9_-]{1,7000}$/.test(encoded)) throw new Error("SMS-Codierung ung\xFCltig.");
    const bytes = Uint8Array.from(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const message = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (!message.trim() || message.length > 5e3) throw new Error("SMS-Text ung\xFCltig.");
    return { number, message, slot };
  }
  async function pairSms() {
    if (!state.native) throw new Error("SMS nur in der Android-App.");
    const cloud = window.IRONCloud, user = await cloud?.currentUser();
    if (!user) throw new Error("Bitte zuerst bei IRON anmelden.");
    if (pairedSmsUser === user.$id) return;
    await cloud.create(cloud.cfg.tables.pcCommands, {
      command: `SMS_REGISTER::${user.$id}`,
      status: "pending",
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      result: ""
    });
    pairedSmsUser = user.$id;
    window.dispatchEvent(new CustomEvent("iron-sms-status", { detail: "Android und PC werden gekoppelt." }));
  }
  async function pollSms() {
    if (!state.native || smsPollBusy || document.hidden) return;
    smsPollBusy = true;
    try {
      await pairSms();
      const { items = [] } = await cloudSms("pending");
      for (const item of items) {
        let sms;
        try {
          sms = decodeSmsCommand(item.command);
        } catch (e) {
          window.dispatchEvent(new CustomEvent("iron-sms-status", { detail: e.message }));
          continue;
        }
        try {
          await cloudSms("claim", { id: item.id });
        } catch {
          continue;
        }
        try {
          await IronPhone.sendSms(sms);
          await cloudSms("ack", { id: item.id, sent: true });
          window.dispatchEvent(new CustomEvent("iron-sms-status", { detail: "SMS an Android \xFCbergeben: " + sms.number }));
        } catch (e) {
          await cloudSms("ack", { id: item.id, sent: false, error: String(e.message || e) }).catch(() => {
          });
          window.dispatchEvent(new CustomEvent("iron-sms-status", { detail: "SMS-Fehler: " + String(e.message || e) }));
        }
      }
    } catch (e) {
      log("SMS relay:", e?.message || e);
    } finally {
      smsPollBusy = false;
    }
  }
  async function composeSms(number, message) {
    if (!state.native) throw new Error("SMS-App nur auf Android verf\xFCgbar.");
    return IronPhone.composeSms({ number, message });
  }
  async function sendSms(number, message, slot = 1) {
    if (!state.native) throw new Error("SMS-Versand nur auf Android verf\xFCgbar.");
    return IronPhone.sendSms({ number, message, slot });
  }
  async function pickHudImage() {
    const result = await Camera2.pickImages({ limit: 1, quality: 92 });
    const photo = result?.photos?.[0];
    const src = photo?.webPath || photo?.path;
    if (!src) throw new Error("Kein Bild ausgew\xE4hlt.");
    const img = document.getElementById("hudImage");
    const empty = document.getElementById("hudImageEmpty");
    if (img) {
      img.src = src;
      img.classList.add("active");
    }
    if (empty) empty.hidden = true;
    return src;
  }
  async function callNumber(number, direct = true) {
    const cleaned = String(number || "").replace(/[^\d+]/g, "");
    if (!cleaned) throw new Error("Keine Telefonnummer angegeben.");
    if (direct) {
      return IronPhone.call({ number: cleaned });
    }
    return IronPhone.dial({ number: cleaned });
  }
  function installHudControls() {
    if (!state.native) return;
    const uploadBtn = document.getElementById("uploadBtn");
    if (uploadBtn && !document.getElementById("nativeImageBtn")) {
      const btn = document.createElement("button");
      btn.id = "nativeImageBtn";
      btn.textContent = "KAMERA / GALERIE";
      btn.onclick = async () => {
        try {
          await pickHudImage();
          window.show?.("Bild wird im IRON HUD angezeigt.");
        } catch (e) {
          window.show?.("Bild-Fehler: " + (e?.message || e));
        }
      };
      uploadBtn.insertAdjacentElement("afterend", btn);
    }
    const center = document.querySelector(".hud-center");
    if (center && !document.getElementById("ironPhoneBox")) {
      const box = document.createElement("div");
      box.id = "ironPhoneBox";
      box.className = "iron-phone-box";
      box.innerHTML = `
      <input id="ironPhoneNumber" inputmode="tel" placeholder="Telefonnummer">
      <button id="ironCallBtn">ANRUFEN</button>
      <button id="ironDialBtn">W\xC4HLFELD</button>
    `;
      center.appendChild(box);
      document.getElementById("ironCallBtn").onclick = async () => {
        const n = document.getElementById("ironPhoneNumber").value;
        try {
          await callNumber(n, true);
        } catch (e) {
          window.show?.("Anruf: " + (e?.message || e));
        }
      };
      document.getElementById("ironDialBtn").onclick = async () => {
        const n = document.getElementById("ironPhoneNumber").value;
        try {
          await callNumber(n, false);
        } catch (e) {
          window.show?.("W\xE4hlfeld: " + (e?.message || e));
        }
      };
    }
    const voiceBtn = document.getElementById("voiceBtn");
    if (voiceBtn) {
      voiceBtn.onclick = async () => {
        const status = document.getElementById("voiceStatus");
        if (status) status.textContent = "LISTENING";
        try {
          const text = await listenOnce();
          if (status) status.textContent = text ? "PROCESSING" : "STANDBY";
          if (text && typeof window.command === "function") {
            await window.command(text);
          } else if (!text) {
            window.show?.("Ich habe dich nicht verstanden. Versuche es erneut.");
            await speak("Ich habe dich nicht verstanden.");
          }
        } catch (e) {
          console.warn("[IRON Mobile] speech:", e);
          window.show?.("Mikrofon-Fehler: " + (e?.message || e));
        } finally {
          if (status) status.textContent = "STANDBY";
        }
      };
    }
  }
  function installTaskReminderUI() {
    if (!state.native || !document.getElementById("tasksList") || document.getElementById("ironReminderBox")) return;
    const host = document.querySelector(".panel-section");
    if (!host) return;
    const box = document.createElement("div");
    box.id = "ironReminderBox";
    box.className = "iron-reminder-box";
    box.innerHTML = `
    <h3>IRON ERINNERUNG</h3>
    <input id="ironReminderText" placeholder="Woran soll IRON erinnern?">
    <input id="ironReminderTime" type="datetime-local">
    <button id="ironReminderBtn">BENACHRICHTIGUNG PLANEN</button>
  `;
    host.prepend(box);
    document.getElementById("ironReminderBtn").onclick = async () => {
      const body = document.getElementById("ironReminderText").value.trim();
      const raw = document.getElementById("ironReminderTime").value;
      try {
        const result = await scheduleNotification({
          title: "IRON TASK",
          body: body || "Task-Erinnerung",
          at: new Date(raw)
        });
        window.show?.("Benachrichtigung geplant.");
        log("notification scheduled", result);
      } catch (e) {
        window.show?.("Benachrichtigung: " + (e?.message || e));
      }
    };
  }
  async function cloudSelfTest() {
    const base = "https://starter-function-4j4o.fra.appwrite.run";
    const paths = ["/api/status", "/api/news", "/api/stocks?symbols=AAPL", "/api/weather?city=Luxembourg"];
    const result = {};
    for (const path of paths) {
      try {
        const r = await fetch(base + path, { cache: "no-store" });
        result[path] = { status: r.status, ok: r.ok };
      } catch (e) {
        result[path] = { ok: false, error: String(e?.message || e) };
      }
    }
    console.log("[IRON Android V2 Cloud Test]", result);
    return result;
  }
  async function callContactByName(name) {
    if (!state.native) throw new Error("Kontaktanrufe sind nur in der Android-App verf\xFCgbar.");
    const found = await IronPhone.lookupContact({ name: String(name || "").trim() });
    if (!found?.number) throw new Error("Keine Telefonnummer f\xFCr diesen Kontakt gefunden.");
    await speak(`Ich rufe ${found.name || name} an.`);
    return IronPhone.call({ number: found.number });
  }
  function installContactVoiceCommands() {
    const original = window.command;
    if (typeof original !== "function") return;
    window.command = async function(text) {
      const raw = String(text || "").trim();
      const sms = raw.match(/^(?:iron[,\s]*)?(?:sende|schicke)\s+(?:eine?\s+)?sms\s+an\s+(\+?[0-9\s()-]{5,24})\s+(?:mit\s+(?:dem\s+)?text|text)\s+(.+)$/i);
      if (sms) {
        try {
          const number = sms[1].replace(/[\s()-]/g, "");
          await sendSms(number, sms[2].trim(), 1);
          window.show?.("SMS an Android \xFCbergeben: " + number + ". Zustellung noch nicht best\xE4tigt.");
        } catch (e) {
          window.show?.("SMS-Fehler: " + (e?.message || e));
        }
        return;
      }
      const m = raw.match(/^(?:iron[,\s]*)?(?:ruf|rufe)\s+(.+?)(?:\s+an)?$/i);
      if (m) {
        try {
          return await callContactByName(m[1].trim());
        } catch (e) {
          window.show?.(e?.message || String(e));
          await speak("Ich konnte den Kontakt nicht anrufen.");
          return;
        }
      }
      return original(text);
    };
  }
  async function createCalendarEvent(event) {
    if (!state.native) throw new Error("Kalender ist nur in der Android-App verf\xFCgbar.");
    return IronCalendar.createEvent({
      title: String(event?.title || "Termin"),
      description: String(event?.description || ""),
      location: String(event?.location || ""),
      start: String(event?.start || ""),
      end: String(event?.end || ""),
      timezone: String(Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Luxembourg"),
      reminderMinutes: Number.isFinite(Number(event?.reminder_minutes)) ? Number(event.reminder_minutes) : 15
    });
  }
  async function init() {
    if (!state.native) {
      log("Browser mode");
      return;
    }
    log("Android native mode");
    await requestNotifications().catch(() => {
    });
    cloudSelfTest().catch(() => {
    });
    setTimeout(installContactVoiceCommands, 500);
    App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        window.dispatchEvent(new Event("iron-app-resume"));
        pollSms();
      }
    });
    setTimeout(pollSms, 1500);
    setInterval(pollSms, 15e3);
    installHudControls();
    installTaskReminderUI();
  }
  window.IRONMobile = {
    isNative: state.native,
    speak,
    listenOnce,
    scheduleNotification,
    requestNotifications,
    pickHudImage,
    callNumber,
    cloudSelfTest,
    callContactByName,
    composeSms,
    sendSms,
    pairSms,
    pollSms,
    createCalendarEvent,
    startConversation,
    stopConversation,
    stopSpeaking,
    init
  };
  document.addEventListener("DOMContentLoaded", init);
})();
/*! Bundled license information:

@capacitor/core/dist/index.js:
  (*! Capacitor: https://capacitorjs.com/ - MIT License *)
*/
