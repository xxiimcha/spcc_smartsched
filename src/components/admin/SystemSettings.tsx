import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Settings, Calendar, BookOpen, Save, AlertCircle } from "lucide-react";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import SuccessMessage from "../popupmsg/SuccessMessage";
import ErrorMessage from "../popupmsg/ErrorMessage";

/* ===================== VALIDATION SCHEMA ===================== */
const settingsSchema = z
  .object({
    currentSchoolYear: z.string(),
    currentSemester: z.string().min(1, "Semester is required"),
    nextSchoolYear: z.string(),
    nextSemester: z.string().min(1, "Next semester is required"),
  })
  .superRefine((val, ctx) => {
    const currentYear = new Date().getFullYear();
    const syRegex = /^\d{4}-\d{4}$/;

    // ---- currentSchoolYear checks ----
    if (!syRegex.test(val.currentSchoolYear)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentSchoolYear"],
        message: "School year must be in format YYYY-YYYY.",
      });
    } else {
      const [s, e] = val.currentSchoolYear.split("-").map(Number);
      if (e !== s + 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["currentSchoolYear"],
          message: "School year must be exactly a one-year gap (e.g., 2025-2026).",
        });
      }
      if (s < currentYear) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["currentSchoolYear"],
          message: `School year cannot be in the past. Earliest allowed is ${currentYear}-${currentYear + 1}.`,
        });
      }
    }

    // ---- nextSchoolYear checks ----
    if (syRegex.test(val.currentSchoolYear)) {
      const [s] = val.currentSchoolYear.split("-").map(Number);
      const expectedNext = `${s + 1}-${s + 2}`;
      if (val.nextSchoolYear !== expectedNext) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["nextSchoolYear"],
          message: `Next School Year should be ${expectedNext} (auto-generated).`,
        });
      }
    }
  });

interface SystemSettingsProps {
  onSettingsChange?: (settings: { schoolYear: string; semester: string }) => void;
}

/* ===================== MAIN COMPONENT ===================== */
const SystemSettings = ({ onSettingsChange }: SystemSettingsProps) => {
  const { settings, updateSettings, isLoading: settingsLoading } = useSystemSettings();

  const [loading, setLoading] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      currentSchoolYear: settings.schoolYear,
      currentSemester: settings.semester,
      nextSchoolYear: "2025-2026",
      nextSemester: "First Semester",
    },
    mode: "onChange", // validate instantly
  });

  /* ===================== HELPERS ===================== */
  const generateNextSchoolYear = (currentYear: string) => {
    const m = currentYear.match(/^\d{4}-\d{4}$/);
    if (!m) return "";
    const [startYear, endYear] = currentYear.split("-");
    const s = parseInt(startYear, 10);
    const e = parseInt(endYear, 10);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e !== s + 1) return "";
    return `${s + 1}-${s + 2}`;
  };

  const handleSchoolYearChange = (value: string) => {
    form.setValue("currentSchoolYear", value, { shouldValidate: true, shouldDirty: true });
    const nextYear = generateNextSchoolYear(value);
    form.setValue("nextSchoolYear", nextYear, { shouldValidate: true, shouldDirty: true });
  };

  // Sync context values
  useEffect(() => {
    if (!settingsLoading) {
      form.setValue("currentSchoolYear", settings.schoolYear, { shouldValidate: true });
      form.setValue("currentSemester", settings.semester, { shouldValidate: true });
      const nextYear = generateNextSchoolYear(settings.schoolYear);
      form.setValue("nextSchoolYear", nextYear, { shouldValidate: true });
    }
  }, [settings, settingsLoading, form]);

  /* ===================== SAVE HANDLER ===================== */
  const handleSubmit = async (values: z.infer<typeof settingsSchema>) => {
    setLoading(true);
    try {
      const newSettings = {
        schoolYear: values.currentSchoolYear,
        semester: values.currentSemester,
      };

      updateSettings(newSettings);
      if (onSettingsChange) onSettingsChange(newSettings);

      setIsSuccessDialogOpen(true);
    } catch (error) {
      console.error("Error saving settings:", error);
      setErrorMessage("Failed to save settings. Please try again.");
      setIsErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  /* ===================== RENDER ===================== */
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            System Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              Changes to school year and semester will affect all scheduling operations.
              Only administrators can modify these settings.
            </AlertDescription>
          </Alert>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* CURRENT ACADEMIC PERIOD */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Current Academic Period
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="currentSchoolYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current School Year</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. 2025-2026"
                            onChange={(e) => handleSchoolYearChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currentSemester"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Semester</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select semester" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="First Semester">First Semester</SelectItem>
                            <SelectItem value="Second Semester">Second Semester</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* NEXT ACADEMIC PERIOD */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Next Academic Period (Preview)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nextSchoolYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next School Year</FormLabel>
                        <FormControl>
                          <Input {...field} disabled className="bg-gray-50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nextSemester"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next Semester</FormLabel>
                        <FormControl>
                          <Input {...field} disabled className="bg-gray-50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* CURRENT SETTINGS PREVIEW */}
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-blue-800">Current Active Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row md:items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">School Year:</span>
                      <span className="text-blue-700">{settings.schoolYear}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Semester:</span>
                      <span className="text-blue-700">{settings.semester}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SAVE BUTTON */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={loading || !form.formState.isValid} // disable if invalid
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* SUCCESS / ERROR DIALOGS */}
      <SuccessMessage
        isOpen={isSuccessDialogOpen}
        onClose={() => setIsSuccessDialogOpen(false)}
        message="System settings updated successfully!"
      />
      <ErrorMessage
        isOpen={isErrorDialogOpen}
        onClose={() => setIsErrorDialogOpen(false)}
        message={errorMessage}
      />
    </div>
  );
};

export default SystemSettings;
