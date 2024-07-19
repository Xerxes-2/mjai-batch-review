import i18n from "i18next";

const DEBUG = process.env.NODE_ENV === "development" && sessionStorage.i18nDebug;

if (DEBUG) {
  sessionStorage.removeItem("__i18nMissingKeys");
}

i18n
  .use({
    type: "backend",
    read(language: string, namespace: string, callback: (errorValue: unknown, translations: null | unknown) => void) {
      if (language === "zh-hans") {
        return callback(null, {});
      }
      import(`./locales/${language}.json`)
        .then((resources) => {
          resources = resources.default;
          callback(null, { ...resources["default"], ...resources[namespace] });
        })
        .catch((error) => {
          callback(error, null);
        });
    },
  })

export default i18n;
