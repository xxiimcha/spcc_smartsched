import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Plus, RefreshCw, Eye, EyeOff } from "lucide-react";
import SuccessMessage from "../popupmsg/SuccessMessage";
import ErrorMessage from "../popupmsg/ErrorMessage";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import axios from "axios";

const ABS_PROFESSORS_URL = "https://spcc-scheduler.site/professors.php";

const optionalNonEmpty = (schema: z.ZodTypeAny) =>
  z.union([schema, z.literal("").transform(() => undefined)]);

const phoneRegex = /^(?:\+?63|0)?(?:\d[\s-]?){9,12}\d$/;

// Allow letters (incl. accents), spaces, dots, apostrophes, and hyphens.
// Disallows digits and other symbols.
const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s.'-]+$/;

const makeSchema = (isEdit: boolean) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(2, { message: "Name must be at least 2 characters" })
      .regex(nameRegex, { message: "Name must not contain numbers or special symbols" }),
    username: z
      .string()
      .min(4, { message: "Username must be at least 4 characters" })
      .regex(/^[a-z0-9._-]+$/, {
        message: "Use lowercase letters, numbers, dot, underscore, or dash",
      }),
    password: isEdit
      ? z
          .union([z.string().min(6), z.literal("")])
          .transform((v) => (v === "" ? undefined : v))
      : z.string().min(6, { message: "Password must be at least 6 characters" }),
    email: z
      .string()
      .trim()
      .min(1, { message: "Email is required" })
      .email({ message: "Please enter a valid email address" }),
    phone: optionalNonEmpty(
      z.string().regex(phoneRegex, { message: "Please enter a valid phone number" })
    ),
    qualifications: z
      .array(z.string())
      .min(1, { message: "Add at least one specialization" }),
  });

interface ProfessorFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaved?: () => void;
  initialData?: Partial<z.infer<ReturnType<typeof makeSchema>>> & { prof_id?: number };
}

const latinize = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const makeUsername = (name: string) => {
  const clean = latinize(name).replace(/[^a-z\s-]/g, " ").trim();
  if (!clean) return `user${Math.floor(Math.random() * 10000)}`;
  const parts = clean.split(/\s+/);
  const base = `${parts[0]}${parts[1]?.charAt(0) ?? ""}`;
  const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return (base || "user") + suffix;
};

const makePassword = (len = 12) => {
  const sets = ["ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz", "0123456789"];
  const required = sets.map((s) => s[Math.floor(Math.random() * s.length)]);
  const all = sets.join("");
  const remain = Array.from({ length: Math.max(0, len - required.length) }, () =>
    all[Math.floor(Math.random() * all.length)]
  );
  const raw = [...required, ...remain];
  for (let i = raw.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [raw[i], raw[j]] = [raw[j], raw[i]];
  }
  return raw.join("");
};

const ProfessorForm = ({
  open = true,
  onOpenChange = () => {},
  onSaved,
  initialData = {
    name: "",
    username: "",
    email: "",
    phone: "",
    qualifications: [],
  },
}: ProfessorFormProps) => {
  const [qualifications, setQualifications] = useState<string[]>(initialData.qualifications || []);
  const [newQualification, setNewQualification] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldCloseForm, setShouldCloseForm] = useState(false);

  const isEdit = Boolean((initialData as any).prof_id);
  const schema = useMemo(() => makeSchema(isEdit), [isEdit]);

  const form = useForm<z.infer<ReturnType<typeof makeSchema>>>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...initialData,
      password: "",
      qualifications: initialData.qualifications || [],
    },
    mode: "onSubmit",
  });

  const resetForm = () => {
    form.reset({
      name: "",
      username: "",
      password: "",
      email: "",
      phone: "",
      qualifications: [],
    });
    setQualifications([]);
    setNewQualification("");
    setShowPassword(false);
  };

  const handleGenerateUsername = () => {
    const name = form.getValues("name");
    const candidate = name && name.trim() !== "" ? makeUsername(name) : makeUsername("");
    form.setValue("username", candidate, { shouldValidate: true, shouldDirty: true });
  };

  const handleGeneratePassword = () => {
    const pwd = makePassword(12);
    form.setValue("password", pwd, { shouldValidate: true, shouldDirty: true });
    setShowPassword(true);
  };

  const addQualification = () => {
    const q = newQualification.trim();
    if (!q) return;
    const next = Array.from(new Set([...qualifications, q]));
    setQualifications(next);
    form.setValue("qualifications", next, { shouldValidate: true });
    setNewQualification("");
  };

  const removeQualification = (index: number) => {
    const updated = qualifications.filter((_, i) => i !== index);
    setQualifications(updated);
    form.setValue("qualifications", updated, { shouldValidate: true });
  };

  const isNoChange = useMemo(() => {
    const values = form.getValues();
    if (!isEdit) return false;
    const baseSame =
      (values.name || "") === (initialData.name || "") &&
      (values.username || "") === (initialData.username || "") &&
      (values.email || "") === (initialData.email || "") &&
      (values.phone || "") === (initialData.phone || "");
    const qualsSame =
      JSON.stringify((values.qualifications || []).map((s) => s.trim())) ===
      JSON.stringify((initialData.qualifications || []).map((s) => s.trim()));
    return baseSame && qualsSame;
  }, [form.watch(), initialData, isEdit]);

  const handleSubmit = async (data: z.infer<ReturnType<typeof makeSchema>>) => {
    try {
      setIsSubmitting(true);

      const payload: any = {
        name: data.name.trim(),
        username: data.username.trim(),
        email: data.email.trim(),
        phone: data.phone || "",
        qualifications: qualifications.map((q) => q.trim()).filter(Boolean),
      };

      if (!isEdit || (data.password && String(data.password).trim() !== "")) {
        payload.password = data.password as string;
      }

      let res;
      if (isEdit) {
        const url = `${ABS_PROFESSORS_URL}?id=${(initialData as any).prof_id}`;
        res = await axios.put(url, payload, { timeout: 20000 });
      } else {
        res = await axios.post(ABS_PROFESSORS_URL, payload, { timeout: 20000 });
      }

      const ok =
        res?.data?.status === "success" ||
        res?.data?.success === true ||
        (typeof res?.status === "number" && res.status >= 200 && res.status < 300);

      if (ok) {
        const actionText = isEdit ? "updated" : "added";
        setSuccessMessage(`Professor ${data.name} ${actionText} successfully!`);
        setIsSuccessDialogOpen(true);
        setShouldCloseForm(true);
        resetForm();
        onSaved?.();
      } else {
        const msg =
          res?.data?.message ||
          res?.data?.error ||
          "Failed to save professor data. Please try again.";
        setErrorMessage(msg);
        setIsErrorDialogOpen(true);
      }
    } catch (err: any) {
      console.error("❌ Submit error:", err?.response?.data || err?.message || err);
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "An error occurred while submitting the form";
      setErrorMessage(serverMsg);
      setIsErrorDialogOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessDialogClose = () => {
    setIsSuccessDialogOpen(false);
    if (shouldCloseForm && onOpenChange) onOpenChange(false);
  };

  // keep exactly which characters are allowed
  const NAME_ALLOWED = /[^A-Za-zÀ-ÖØ-öø-ÿ\s.'-]/g; // anything NOT allowed

  const sanitizeName = (v: string) => v.replace(NAME_ALLOWED, "");

  // Block numeric keys (top row & numpad)
  const isDigitKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { key, code } = e;
    return /[0-9]/.test(key) || /^Numpad[0-9]$/.test(code);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {initialData.name ? "Edit Professor" : "Add New Professor"}
            </DialogTitle>
            <DialogDescription>
              {initialData.name
                ? "Update the professor information below."
                : "Fill in the details to create a new professor account."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => {
                      handleGenerateUsername();
                      handleGeneratePassword();
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Auto-generate Credentials
                  </Button>
                </div>

                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          {...field}
                          autoComplete="name"
                          inputMode="text"
                          pattern={nameRegex.source} // keeps browser validation hint
                          onKeyDown={(e) => {
                            if (isDigitKey(e)) {
                              e.preventDefault(); // block typing digits
                            }
                          }}
                          onChange={(e) => {
                            const cleaned = sanitizeName(e.target.value);
                            // only update if something changed (prevents cursor jumps)
                            if (cleaned !== e.target.value) {
                              const pos = e.target.selectionStart || 0;
                              field.onChange(cleaned);
                              // let the browser update caret naturally on next paint
                            } else {
                              field.onChange(e);
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pasted = (e.clipboardData || (window as any).clipboardData).getData("text");
                            const cleaned = sanitizeName(pasted);
                            const target = e.target as HTMLInputElement;
                            const before = target.value.slice(0, target.selectionStart || 0);
                            const after = target.value.slice(target.selectionEnd || 0);
                            const next = sanitizeName(before + cleaned + after);
                            field.onChange(next);
                          }}
                          onBlur={() => {
                            field.onBlur();
                            const uname = form.getValues("username");
                            if (!uname) {
                              // regenerate username if blank
                              const candidate = sanitizeName(form.getValues("name") || "");
                              if (candidate.trim()) {
                                form.setValue("username", makeUsername(candidate), {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                });
                              }
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                {/* Username */}
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <div className="flex items-center space-x-2">
                        <FormControl>
                          <Input placeholder="johndoe" {...field} />
                        </FormControl>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={handleGenerateUsername}
                          title="Auto-generate username"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Password{isEdit ? " (leave blank to keep current)" : ""}
                      </FormLabel>
                      <div className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <FormControl>
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••••••"
                              {...field}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setShowPassword(!showPassword)}
                            title={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={handleGeneratePassword}
                          title="Auto-generate password"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john.doe@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+63 923 456 7899" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Qualifications */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="qualifications"
                  render={() => (
                    <FormItem>
                      <FormLabel>Specialization</FormLabel>
                      <div className="flex items-center space-x-2">
                        <Input
                          placeholder="Add Specialization"
                          value={newQualification}
                          onChange={(e) => setNewQualification(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addQualification();
                            }
                          }}
                        />
                        <Button type="button" onClick={addQualification} size="icon" variant="outline">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {qualifications.map((q, i) => (
                          <div
                            key={`${q}-${i}`}
                            className="flex items-center bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm"
                          >
                            {q}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 ml-1 p-0"
                              onClick={() => removeQualification(i)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || isNoChange}>
                  {isSubmitting
                    ? "Submitting…"
                    : (initialData as any).prof_id
                    ? isNoChange
                      ? "No changes"
                      : "Update Professor"
                    : "Add Professor"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <SuccessMessage
        isOpen={isSuccessDialogOpen}
        onClose={handleSuccessDialogClose}
        message={successMessage}
      />
      <ErrorMessage
        isOpen={isErrorDialogOpen}
        onClose={() => setIsErrorDialogOpen(false)}
        message={errorMessage}
      />
    </>
  );
};

export default ProfessorForm;
