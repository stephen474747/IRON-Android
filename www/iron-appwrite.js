(() => {
  "use strict";

  const CONFIG = Object.freeze({
    endpoint: "https://fra.cloud.appwrite.io/v1",
    projectId: "6a9ff5910019d4b95d45",
    databaseId: "iron",
    functionDomain: "https://starter-function-4j4o.fra.appwrite.run",
    tables: Object.freeze({
      tasks: "tasks",
      plans: "plans",
      pcCommands: "pccommands",
      pcStatus: "pc_status"
    }),
    pcStatusRowId: "main_pc"
  });

  window.IRON_APPWRITE = CONFIG;

  function fail(message) {
    window.IRON_APPWRITE_LOAD_ERROR = message;
    console.error("[IRON/Appwrite]", message);
  }

  if (!window.Appwrite) {
    fail("Appwrite Web SDK wurde nicht geladen.");
    return;
  }

  if (typeof window.Appwrite.Client !== "function") {
    fail("Appwrite.Client fehlt im geladenen SDK.");
    return;
  }

  if (typeof window.Appwrite.Account !== "function") {
    fail("Appwrite.Account fehlt im geladenen SDK.");
    return;
  }

  if (typeof window.Appwrite.TablesDB !== "function") {
    fail("Appwrite.TablesDB fehlt im geladenen SDK. Erwartet wird Appwrite Web SDK 27.0.0.");
    return;
  }

  if (typeof window.Appwrite.Functions !== "function") {
    fail("Appwrite.Functions fehlt im geladenen SDK.");
    return;
  }

  try {
    const client = new window.Appwrite.Client();
    client.setEndpoint(CONFIG.endpoint).setProject(CONFIG.projectId);

    const account = new window.Appwrite.Account(client);
    const tablesDB = new window.Appwrite.TablesDB(client);
    const functions = new window.Appwrite.Functions(client);
    const ID = window.Appwrite.ID;
    const Query = window.Appwrite.Query;
    const Permission = window.Appwrite.Permission;
    const Role = window.Appwrite.Role;

    async function currentUser() {
      try {
        return await account.get();
      } catch (e) {
        if (e && e.code === 401) return null;
        throw e;
      }
    }

    async function login(email, password) {
      if (!email || !password) throw new Error("E-Mail und Passwort eingeben.");
      await account.createEmailPasswordSession({ email, password });
      return account.get();
    }

    async function logout() {
      return account.deleteSession({ sessionId: "current" });
    }

    async function list(tableId, queries = []) {
      const result = await tablesDB.listRows({
        databaseId: CONFIG.databaseId,
        tableId,
        queries
      });
      return result.rows || [];
    }

    async function create(tableId, data, rowId = ID.unique(), permissions = undefined) {
      const args = {
        databaseId: CONFIG.databaseId,
        tableId,
        rowId,
        data
      };
      if (permissions) args.permissions = permissions;
      return tablesDB.createRow(args);
    }

    async function update(tableId, rowId, data) {
      return tablesDB.updateRow({
        databaseId: CONFIG.databaseId,
        tableId,
        rowId,
        data
      });
    }

    async function remove(tableId, rowId) {
      return tablesDB.deleteRow({
        databaseId: CONFIG.databaseId,
        tableId,
        rowId
      });
    }

    async function get(tableId, rowId) {
      return tablesDB.getRow({
        databaseId: CONFIG.databaseId,
        tableId,
        rowId
      });
    }

    async function pingCloud() {
      try {
        const response = await fetch(CONFIG.functionDomain + "/api/status", {
          method: "GET",
          cache: "no-store"
        });

        if (!response.ok) return false;

        const data = await response.json().catch(() => null);
        return !!(data && data.ok && data.active);
      } catch {
        return false;
      }
    }

    async function askAI(message) {
      // Verify the browser session first, then create a fresh 15-minute JWT.
      const user = await currentUser();
      if (!user) throw new Error("Nicht angemeldet. Bitte melde dich erneut bei IRON an.");

      async function callWithFreshJWT() {
        const token = await account.createJWT();
        return fetch(CONFIG.functionDomain + "/api/chat", {
          method: "POST",
          // text/plain keeps this a CORS "simple request" in browsers and
          // avoids a failing OPTIONS preflight on some Function-domain setups.
          headers: {
            "content-type": "text/plain;charset=UTF-8"
          },
          body: JSON.stringify({
            message,
            userJwt: token.jwt,
            source: (window.IRONMobile?.isNative ? "android" : "web"),
            conversation_id: (window.IRONMobile?.isNative ? "mobile-main" : "web-main")
          })
        });
      }

      let response;
      try {
        response = await callWithFreshJWT();
      } catch (e) {
        throw new Error(
          "IRON AI-Function ist aus der Android-App momentan nicht erreichbar. Appwrite-Datenbank ist weiterhin verbunden."
        );
      }

      let payload = null;
      try { payload = await response.json(); }
      catch { throw new Error(`Cloud-AI lieferte keine JSON-Antwort (HTTP ${response.status}).`); }

      if (response.status === 401) {
        throw new Error(payload?.error || "IRON-Sitzung ungültig. Bitte einmal ab- und wieder anmelden.");
      }

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || `Cloud-AI HTTP ${response.status}`);
      }
      return payload.reply;
    }

    function userRowPermissions(userId) {
      if (!Permission || !Role || !userId) return undefined;
      const role = Role.user(userId);
      return [
        Permission.read(role),
        Permission.update(role),
        Permission.delete(role)
      ];
    }

    async function diagnose() {
      const result = {
        sdk: true,
        bridge: true,
        endpoint: CONFIG.endpoint,
        projectId: CONFIG.projectId,
        databaseId: CONFIG.databaseId,
        hostname: location.hostname,
        user: null,
        tables: {}
      };

      try {
        const user = await currentUser();
        if (!user) {
          result.account = { ok: true, loggedIn: false, code: 401 };
          return result;
        }
        result.account = { ok: true, loggedIn: true };
        result.user = { id: user.$id, email: user.email };
      } catch (e) {
        result.account = {
          ok: false,
          loggedIn: false,
          code: e?.code ?? null,
          type: e?.type ?? null,
          message: e?.message || String(e)
        };
        return result;
      }

      for (const [name, tableId] of Object.entries(CONFIG.tables)) {
        try {
          const rows = await list(tableId, [Query.limit(1)]);
          result.tables[name] = {
            ok: true,
            id: tableId,
            rowsVisible: rows.length
          };
        } catch (e) {
          result.tables[name] = {
            ok: false,
            id: tableId,
            code: e?.code ?? null,
            type: e?.type ?? null,
            message: e?.message || String(e)
          };
        }
      }

      return result;
    }

    window.IRONCloud = Object.freeze({
      cfg: CONFIG,
      client,
      account,
      tablesDB,
      functions,
      ID,
      Query,
      Permission,
      Role,
      userRowPermissions,
      currentUser,
      login,
      logout,
      list,
      create,
      update,
      remove,
      get,
      askAI,
      pingCloud,
      diagnose
    });

    window.IRON_APPWRITE_READY = true;
    console.log("[IRON/Appwrite] Bridge bereit.");
  } catch (e) {
    fail(e?.message || String(e));
  }
})();