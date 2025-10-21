import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Users,
  Building,
  Calendar,
} from "lucide-react";
import axios from "axios";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import SchoolHeadForm from "./SchoolHeadForm";
import SuccessMessage from "../popupmsg/SuccessMessage";

interface SchoolHead {
  id: string;
  name: string;
  email: string;
  username: string;
  password: string;
}

const SchoolHeadManagement = () => {
  const [schoolHeads, setSchoolHeads] = useState<SchoolHead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSchoolHead, setSelectedSchoolHead] =
    useState<SchoolHead | null>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { toast } = useToast();

  // Fetch school heads from PHP backend
  const fetchSchoolHeads = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        "https://spcc-scheduler.site/acad_head.php"
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === "error") {
        throw new Error(result.message || "Unknown error occurred");
      }

      // Check if the response contains data property
      if (result.data && Array.isArray(result.data)) {
        setSchoolHeads(result.data);
      } else if (Array.isArray(result)) {
        setSchoolHeads(result);
      } else {
        setSchoolHeads([]); // Set to empty array if no valid data
        console.warn("Unexpected API response format:", result);
      }
    } catch (err) {
      console.error("Error fetching school heads:", err);
      setError("Failed to load school heads. Please try again later.");
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err instanceof Error
            ? err.message
            : "Could not fetch school heads from the server.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchoolHeads();
  }, []);

  const addSchoolHead = async (schoolHeadData: Omit<SchoolHead, "id">) => {
    try {
      console.log("Sending data to backend:", schoolHeadData);

      const requestBody = {
        name: schoolHeadData.name,
        username: schoolHeadData.username,
        email: schoolHeadData.email || null,
        password: schoolHeadData.password,
      };

      console.log("Request body:", requestBody);

      const response = await fetch(
        "https://spcc-scheduler.site/acad_head.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      const result = await response.json();

      console.log("Response result:", result);

      if (result.status === "error") {
        throw new Error(result.message || "Failed to add school head");
      }

      // Handle different API response formats
      if (result.data && result.data.id) {
        setSchoolHeads((prevSchoolHeads) => [...prevSchoolHeads, result.data]);
      } else if (result.schoolHead && result.schoolHead.id) {
        setSchoolHeads((prevSchoolHeads) => [
          ...prevSchoolHeads,
          result.schoolHead,
        ]);
      } else {
        fetchSchoolHeads(); // Refetch all school heads if we can't extract the new one
      }

      setSuccessMessage(
        `School Head ${schoolHeadData.name} added successfully!`
      );
      setIsSuccessDialogOpen(true);
      setIsAddDialogOpen(false);

      return true;
    } catch (err) {
      console.error("Error adding school head:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err instanceof Error
            ? err.message
            : "Failed to add school head. Please try again.",
      });
      return false;
    }
  };

  const updateSchoolHead = async (
    id: string,
    schoolHeadData: Omit<SchoolHead, "id">
  ) => {
    try {
      const response = await fetch(
        `https://spcc-scheduler.site/acad_head.php?id=${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: schoolHeadData.name,
            username: schoolHeadData.username,
            email: schoolHeadData.email || null,
          }),
        }
      );

      const result = await response.json();

      if (result.status === "error") {
        throw new Error(result.message || "Failed to update school head");
      }

      setSchoolHeads((prevSchoolHeads) =>
        prevSchoolHeads.map((head) =>
          head.id === id ? { ...schoolHeadData, id } : head
        )
      );

      setIsEditDialogOpen(false);
      setSuccessMessage(
        `School Head ${schoolHeadData.name} updated successfully!`
      );
      setIsSuccessDialogOpen(true);

      return true;
    } catch (err) {
      console.error("Error updating school head:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err instanceof Error
            ? err.message
            : "Failed to update school head. Please try again.",
      });
      return false;
    }
  };

  const deleteSchoolHead = async (id: string) => {
    try {
      const response = await fetch(
        `https://spcc-scheduler.site/acad_head.php?id=${id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (result.status === "error") {
        throw new Error(result.message || "Failed to delete school head");
      }

      setSchoolHeads((prevSchoolHeads) =>
        prevSchoolHeads.filter((head) => head.id !== id)
      );

      setIsDeleteDialogOpen(false);
      const schoolHeadName = selectedSchoolHead?.name || "School Head";
      setSuccessMessage(`${schoolHeadName} deleted successfully!`);
      setIsSuccessDialogOpen(true);

      return true;
    } catch (err) {
      console.error("Error deleting school head:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err instanceof Error
            ? err.message
            : "Failed to delete school head. Please try again.",
      });
      return false;
    }
  };

  const handleAddSchoolHead = async (data: {
    name: string;
    username: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }) => {
    return await addSchoolHead({
      name: data.name,
      username: data.username,
      email: data.email || "",
      password: data.password || "",
    });
  };

  const handleUpdateSchoolHead = async (data: {
    name: string;
    username: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }) => {
    if (selectedSchoolHead) {
      // Only update fields that have changed or are provided
      const updateData: any = {
        name: data.name,
        username: data.username,
        email: data.email || null,
      };

      // Only include password if it's provided (not empty)
      if (data.password && data.password.trim() !== "") {
        updateData.password = data.password;
      }

      const success = await updateSchoolHead(
        selectedSchoolHead.id ?? "",
        updateData
      );
      return success;
    }
    return false;
  };

  const handleDeleteSchoolHead = async () => {
    if (selectedSchoolHead) {
      await deleteSchoolHead(selectedSchoolHead.id ?? "");
    }
  };

  const openEditDialog = (head: SchoolHead) => {
    setSelectedSchoolHead(head);
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (head: SchoolHead) => {
    setSelectedSchoolHead(head);
    setIsViewDialogOpen(true);
  };

  const openDeleteDialog = (head: SchoolHead) => {
    setSelectedSchoolHead(head);
    setIsDeleteDialogOpen(true);
  };

  const openAddDialog = () => {
    setSelectedSchoolHead(null);
    setIsAddDialogOpen(true);
  };

  const filteredSchoolHeads = schoolHeads.filter(
    (schoolHead) =>
      schoolHead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schoolHead.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="w-full p-6 bg-white rounded-lg shadow-sm flex justify-center">
        <div className="text-center">
          <p className="text-lg">Loading school heads...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6 bg-white rounded-lg shadow-sm">
        <div className="text-center">
          <p className="text-lg text-destructive">{error}</p>
          <Button className="mt-4" onClick={fetchSchoolHeads}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">School Head Management</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add School Head
        </Button>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search school heads by name or email..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSchoolHeads.length > 0 ? (
              filteredSchoolHeads.map((head) => (
                <TableRow key={head.id}>
                  <TableCell className="font-medium">{head.name}</TableCell>
                  <TableCell>{head.username}</TableCell>
                  <TableCell>{head.email || "N/A"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openViewDialog(head)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(head)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(head)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-6 text-muted-foreground"
                >
                  No school heads found. Try a different search or add a new
                  school head.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add School Head Dialog */}
      {isAddDialogOpen && (
        <SchoolHeadForm
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSubmit={handleAddSchoolHead}
          existingUsernames={schoolHeads.map((head) => head.username)}
        />
      )}

      {/* Edit School Head Dialog */}
      {isEditDialogOpen && selectedSchoolHead && (
        <SchoolHeadForm
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSubmit={handleUpdateSchoolHead}
          initialData={{
            name: selectedSchoolHead.name,
            username: selectedSchoolHead.username || "",
            email: selectedSchoolHead.email || "",
            password: "",
            confirmPassword: "",
          }}
          existingUsernames={schoolHeads
            .filter((head) => head.id !== selectedSchoolHead.id)
            .map((head) => head.username)}
        />
      )}

      {/* View School Head Dialog */}
      {isViewDialogOpen && selectedSchoolHead && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                School Head Details
              </DialogTitle>
              <DialogDescription>
                View detailed information about the selected school head.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Name
                </h3>
                <p className="text-base">{selectedSchoolHead.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Email
                </h3>
                <p className="text-base">{selectedSchoolHead.email || "N/A"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Username
                </h3>
                <p className="text-base">{selectedSchoolHead.username}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && selectedSchoolHead && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                Confirm Deletion
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. Please confirm before proceeding.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-base">
                Are you sure you want to delete school head{" "}
                <span className="font-semibold">{selectedSchoolHead.name}</span>
                ?
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteSchoolHead}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Success Message Dialog */}
      <SuccessMessage
        isOpen={isSuccessDialogOpen}
        onClose={() => setIsSuccessDialogOpen(false)}
        message={successMessage}
      />
    </div>
  );
};

export default SchoolHeadManagement;
