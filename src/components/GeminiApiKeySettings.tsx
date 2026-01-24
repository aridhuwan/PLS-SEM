"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Key, Save, X, Trash2 } from "lucide-react";

interface GeminiApiKeySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const GEMINI_API_KEY_STORAGE_KEY = "geminiApiKey";

const GeminiApiKeySettings: React.FC<GeminiApiKeySettingsProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
      if (storedKey) {
        setApiKey(storedKey);
      } else {
        setApiKey("");
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, apiKey.trim());
      toast.success("Gemini API Key saved successfully!");
      onClose();
    } else {
      toast.error("API Key cannot be empty.");
    }
  };

  const handleClear = () => {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
    setApiKey("");
    toast.info("Gemini API Key cleared.");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-600" /> Gemini API Key Settings
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="gemini-api-key" className="text-right">
              API Key
            </Label>
            <Input
              id="gemini-api-key"
              type="password" // Use password type for sensitive input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="col-span-3"
              placeholder="Enter your Gemini API Key"
            />
          </div>
          <p className="text-xs text-gray-500 col-span-4 text-center">
            Your API key is stored locally in your browser.
          </p>
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleClear} className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50">
            <Trash2 className="w-4 h-4 mr-2" /> Clear Key
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" /> Save Key
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GeminiApiKeySettings;