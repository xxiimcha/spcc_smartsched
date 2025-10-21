import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { RefreshCw, Eye, EyeOff } from "lucide-react";
import SuccessMessage from "../popupmsg/SuccessMessage";
import ErrorMessage from "../popupmsg/ErrorMessage";
import {
  Form,
  FormControl,
  FormDescription,
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

interface SchoolHeadFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit?: (data: any) => Promise<boolean>;
  initialData?: Partial<{
    name: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }>;
  existingUsernames?: string[];
}

const SchoolHeadForm = ({
  open = true,
  onOpenChange = () => {},
  onSubmit = () => Promise.resolve(true),
  initialData = {
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  },
  existingUsernames = [],
}: SchoolHeadFormProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Track submission status
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Track if form dialog should close
  const [shouldCloseForm, setShouldCloseForm] = useState(false);

  // Create dynamic schema with username validation
  const formSchema = z
    .object({
      name: z
        .string()
        .min(2, { message: "Name must be at least 2 characters" }),
      username: z
        .string()
        .min(4, { message: "Username must be at least 4 characters" })
        .refine((username) => !existingUsernames.includes(username), {
          message: "Username already exists. Please choose a different one.",
        }),
      email: z
        .string()
        .email({ message: "Please enter a valid email address" })
        .optional()
        .or(z.literal("")),
      password: z
        .string()
        .min(6, { message: "Password must be at least 6 characters" })
        .optional()
        .or(z.literal("")),
      confirmPassword: z.string().optional().or(z.literal("")),
    })
    .refine(
      (data) => {
        // If password is provided, confirmPassword must match
        if (data.password && data.password.trim() !== "") {
          return data.password === data.confirmPassword;
        }
        return true;
      },
      {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      }
    );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...initialData,
      confirmPassword: initialData.confirmPassword || "",
    },
  });

  const resetForm = () => {
    form.reset({
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const generateUsername = () => {
    const name = form.getValues("name");
    if (!name || name.trim() === "") {
      const randomName = "user" + Math.floor(Math.random() * 10000);
      form.setValue("username", randomName);
      return;
    }

    const nameParts = name.toLowerCase().trim().split(" ");
    const generatedUsername =
      nameParts[0] +
      (nameParts.length > 1 ? nameParts[1].charAt(0) : "") +
      Math.floor(Math.random() * 1000);

    form.setValue("username", generatedUsername);
  };

  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    form.setValue("password", password);
    form.setValue("confirmPassword", password);
    setShowPassword(true);
    setShowConfirmPassword(true);
  };

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);

      // Validate password requirements for new school heads
      if (
        !initialData.name &&
        (!data.password || data.password.trim() === "")
      ) {
        setErrorMessage("Password is required for new school heads");
        setIsErrorDialogOpen(true);
        return;
      }

      // Set success message with the school head's name
      const actionText = initialData.name ? "updated" : "added";
      setSuccessMessage(`School Head ${data.name} ${actionText} successfully!`);

      // Submit to parent component and get result
      const result = await onSubmit(data);

      if (result) {
        // Reset form
        resetForm();

        // Show success message
        setIsSuccessDialogOpen(true);

        // Set flag to close form after success dialog is dismissed
        setShouldCloseForm(true);
      } else {
        // If submission failed but no error was thrown
        setErrorMessage("Failed to save school head data. Please try again.");
        setIsErrorDialogOpen(true);
      }
    } catch (error) {
      console.error("Error submitting data:", error);
      setErrorMessage("An error occurred while submitting the form");
      setIsErrorDialogOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle success dialog close
  const handleSuccessDialogClose = () => {
    setIsSuccessDialogOpen(false);

    // Close the form dialog if needed
    if (shouldCloseForm && onOpenChange) {
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {initialData.name ? "Edit School Head" : "Add New School Head"}
            </DialogTitle>
            <DialogDescription>
              {initialData.name
                ? "Update the school head information below."
                : "Fill in the details to create a new school head account."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!initialData.name && (
                  <div className="md:col-span-2 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => {
                        generateUsername();
                        generatePassword();
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Auto-generate Credentials
                    </Button>
                  </div>
                )}

                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Dr. Maria Santos" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter the full name of the school head
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <div className="flex items-center space-x-2">
                          <FormControl>
                            <Input placeholder="mariasantos" {...field} />
                          </FormControl>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={generateUsername}
                            title="Auto-generate username from name"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Generate
                          </Button>
                        </div>
                        <FormDescription>
                          Username must be unique and at least 4 characters long
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="maria.santos@spcc.edu.ph"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Email address for communication (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {initialData.name
                          ? "New Password (Optional)"
                          : "Password"}
                      </FormLabel>
                      <div className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <FormControl>
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder={
                                initialData.name
                                  ? "Leave blank to keep current"
                                  : "••••••••"
                              }
                              {...field}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setShowPassword(!showPassword)}
                            title={
                              showPassword ? "Hide password" : "Show password"
                            }
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={generatePassword}
                          title="Auto-generate password"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormDescription>
                        {initialData.name
                          ? "Leave blank to keep current password, or enter new password (min 6 characters)"
                          : "Password must be at least 6 characters long"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {initialData.name
                          ? "Confirm New Password"
                          : "Confirm Password"}
                      </FormLabel>
                      <div className="relative flex-1">
                        <FormControl>
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder={
                              initialData.name
                                ? "Confirm new password"
                                : "••••••••"
                            }
                            {...field}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          title={
                            showConfirmPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <FormDescription>
                        {initialData.name
                          ? "Re-enter the new password to confirm"
                          : "Re-enter the password to confirm"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Submitting..."
                    : initialData.name
                    ? "Update School Head"
                    : "Add School Head"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Success and Error Messages */}
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

export default SchoolHeadForm;
