import { X } from "lucide-react";
import { useCallback, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { useTransliteration } from "@/features/poster/hooks/use-transliteration";
import { cn } from "@/lib/utils";

type TranslitInputProps = {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  id?: string;
  listboxId: string;
  placeholder?: string;
  className?: string;
};

export function TranslitInput({
  className,
  id,
  listboxId,
  onFocus,
  onChange,
  placeholder,
  value,
}: TranslitInputProps) {
  const translit = useTransliteration();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
      translit.scheduleSuggestions("name", inputRef.current);
    },
    [onChange, translit],
  );

  const handleFocus = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      onFocus?.();
      translit.scheduleSuggestions("name", event.target);
    },
    [onFocus, translit],
  );

  const handleKeydown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const isArrowDown = event.key === "ArrowDown";
      const isArrowUp = event.key === "ArrowUp";
      const shouldApply =
        event.key === "Enter" || event.key === "Tab" || event.key === " ";

      if (isArrowDown || isArrowUp) {
        if (
          !translit.nameSuggestionsVisible &&
          translit.nameSuggestions.length > 0
        ) {
          translit.setNameSuggestionsVisible(true);
        }
        if (translit.nameSuggestions.length > 0) {
          event.preventDefault();
          const delta = isArrowDown ? 1 : -1;
          const next =
            translit.nameSuggestionIndex === -1
              ? 0
              : translit.nameSuggestionIndex + delta;
          translit.setSuggestionIndex("name", next);
        }
        return;
      }

      if (!shouldApply || !translit.nameSuggestionsVisible) return;
      const idx = translit.nameSuggestionIndex;
      const picked =
        idx >= 0 ? translit.nameSuggestions[idx] : translit.nameSuggestions[0];
      if (!picked) return;
      event.preventDefault();
      const result = translit.applySuggestion(
        "name",
        picked,
        inputRef.current,
        event.key === " " ? " " : "",
      );
      if (result !== null) onChange(result.value);
    },
    [onChange, translit],
  );

  const pickSuggestion = useCallback(
    (picked: string) => {
      const result = translit.applySuggestion(
        "name",
        picked,
        inputRef.current,
        " ",
      );
      if (result === null) return;
      onChange(result.value);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(result.cursor, result.cursor);
      });
    },
    [onChange, translit],
  );

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) translit.hideNameSuggestions();
      }}
      open={translit.nameSuggestionsVisible}
    >
      <PopoverAnchor asChild>
        <Input
          aria-activedescendant={
            translit.nameSuggestionIndex >= 0
              ? `${listboxId}-option-${translit.nameSuggestionIndex}`
              : undefined
          }
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={translit.nameSuggestionsVisible}
          aria-haspopup="listbox"
          autoComplete="off"
          className={className}
          id={id}
          onBlur={translit.hideNameSuggestions}
          onChange={handleInput}
          onFocus={handleFocus}
          onKeyDown={handleKeydown}
          placeholder={placeholder}
          ref={inputRef}
          role="combobox"
          type="text"
          value={value}
        />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="group z-100 w-72 min-w-50 p-0 lg:w-auto"
        onCloseAutoFocus={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div
          className="flex max-h-[40vh] flex-col overflow-y-auto p-1"
          id={listboxId}
          role="listbox"
        >
          <div className="flex items-center justify-between px-2 py-1 text-muted-foreground text-xs">
            <span>Suggestions</span>
            <Button
              aria-label="Close suggestions"
              className="h-auto p-0"
              onClick={translit.hideNameSuggestions}
              variant="ghost"
            >
              <X className="size-3" />
            </Button>
          </div>
          <div className="flex flex-col group-data-[side=top]:flex-col-reverse">
            {translit.nameSuggestions.map((suggestion, index) => (
              <button
                aria-selected={index === translit.nameSuggestionIndex}
                className={cn(
                  "flex w-full items-center rounded-sm px-3 py-2 text-left text-sm hover:bg-accent",
                  index === translit.nameSuggestionIndex && "bg-accent",
                )}
                id={`${listboxId}-option-${index}`}
                key={`${listboxId}-option-${suggestion}`}
                onClick={() => pickSuggestion(suggestion)}
                onMouseEnter={() => translit.setSuggestionIndex("name", index)}
                role="option"
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
