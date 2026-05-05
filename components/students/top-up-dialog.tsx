"use client";

import { addPackage } from "@/app/actions/students";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  studentId: string;
};

export function TopUpDialog({ studentId }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button">Top up hours</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add prepaid hours</DialogTitle>
        </DialogHeader>
        <form action={addPackage.bind(null, studentId)} className="grid gap-4 pt-2">
          <div className="grid gap-2">
            <Label htmlFor="hoursPurchased">Hours purchased</Label>
            <Input
              id="hoursPurchased"
              name="hoursPurchased"
              type="number"
              step="0.5"
              min="0.5"
              required
              placeholder="e.g. 10"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pricePerSession">Price per session (optional)</Label>
            <Input
              id="pricePerSession"
              name="pricePerSession"
              type="text"
              placeholder="informational only"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Input id="note" name="note" type="text" />
          </div>
          <Button type="submit" className="w-full sm:w-auto">
            Save package
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
