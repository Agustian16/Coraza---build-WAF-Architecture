"use client";

import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";

function defineSecLang(monaco: Monaco) {
  monaco.languages.register({ id: "seclang" });
  monaco.languages.setMonarchTokensProvider("seclang", {
    tokenizer: {
      root: [
        [/Sec(Rule|Action|RuleUpdateTargetById|RuleRemoveById|RuleEngine|RequestBodyAccess|ResponseBodyAccess)/, "keyword"],
        [/"@[a-zA-Z]+/, "type.identifier"],
        [/\b(id|phase|deny|pass|log|allow|status|msg|logdata|tag|severity|chain|ctl|t:[a-z]+)\b/, "attribute.name"],
        [/'[^']*'/, "string"],
        [/"[^"]*"/, "string"],
        [/%\{[^}]+\}/, "variable"],
        [/\b\d+\b/, "number"],
        [/#.*$/, "comment"],
      ],
    },
  });
}

export function SecLangEditor({
  value,
  onChange,
}: {
  value: string;
  onChange?: (v: string) => void;
}) {
  const onMount: OnMount = (editor, monaco) => {
    defineSecLang(monaco);
    monaco.editor.setTheme("vs-dark");
    editor.updateOptions({ minimap: { enabled: false }, fontSize: 12 });
  };

  return (
    <div className="overflow-hidden rounded-lg border border-line">
      {/* ponytail: theme set on mount instead of pre-defined custom theme */}
      <Editor
        height="320px"
        defaultLanguage="seclang"
        defaultValue={value}
        beforeMount={defineSecLang}
        onMount={onMount}
        onChange={(v) => onChange?.(v ?? "")}
        options={{
          fontFamily: "var(--font-geist-mono), monospace",
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
        }}
        // ponytail: load from CDN default — self-host monaco assets when offline builds are required
        loading={<div className="p-3 text-xs text-muted">Loading editor…</div>}
      />
    </div>
  );
}
