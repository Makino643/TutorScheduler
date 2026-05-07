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
import { copy, type Locale } from "@/lib/i18n";

type Props = {
  studentId: string;
  locale: Locale;
};

export function TopUpDialog({ studentId, locale }: Props) {
  const c = copy[locale].students;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button">{c.topUpHours}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{c.prepaidPackages}</DialogTitle>
        </DialogHeader>
        <form action={addPackage.bind(null, studentId)} className="grid gap-4 pt-2">
          <div className="grid gap-2">
            <Label htmlFor="hoursPurchased">{c.hours}</Label>
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
            <Label htmlFor="pricePerSession">{c.pricePerSession}</Label>
            <Input
              id="pricePerSession"
              name="pricePerSession"
              type="text"
              placeholder={c.note}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="note">{c.note}</Label>
            <Input id="note" name="note" type="text" />
          </div>
          <Button type="submit" className="w-full sm:w-auto">
            {c.saveChanges}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
