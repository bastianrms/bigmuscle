// plasmic/code-login-controller.ts
import LogInController from "../components/logInController";

export function registerLoginController(plasmic: any) {
  plasmic.registerComponent(LogInController, {
    name: "LoginController",
    displayName: "Login controller",

    props: {
      // Standard-Redirect (kann in Plasmic gesetzt werden)
      redirectTo: {
        type: "string",
        displayName: "Default redirect URL",
        defaultValue: "/home",
      },

      hasError: {
        type: "boolean",
        displayName: "Has error",
      },
      isLoading: {
        type: "boolean",
        displayName: "Is loading",
      },
      onHasErrorChange: {
        type: "eventHandler",
        argTypes: [{ name: "value", type: "boolean" }],
      },
      onIsLoadingChange: {
        type: "eventHandler",
        argTypes: [{ name: "value", type: "boolean" }],
      },
    },

    states: {
      hasError: {
        type: "writable",
        valueProp: "hasError",
        onChangeProp: "onHasErrorChange",
      },
      isLoading: {
        type: "writable",
        valueProp: "isLoading",
        onChangeProp: "onIsLoadingChange",
      },
    },

    // wichtig: refActions (nicht actions)
    refActions: {
      attemptLogin: {
        displayName: "Attempt login",
        argTypes: [
          { name: "email", type: "string" },
          { name: "password", type: "string" },
          {
            name: "redirectTo",
            type: "string",
            displayName: "Redirect URL (override prop)",
            defaultValue: "/home",
          },
        ],
      },
    },
  });
}