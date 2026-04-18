"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, LoaderIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const contactFormSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  company: z.string().optional(),
  phone: z.string().min(1, "Phone number is required"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email"),
  country: z.string().optional(),
  companySize: z.string().optional(),
  referral: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

interface Contact1Props {
  className?: string;
  onSubmit?: (data: ContactFormData) => Promise<void>;
}

const Contact1 = ({ className, onSubmit }: Contact1Props) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      fullName: "",
      company: "",
      phone: "",
      email: "",
      country: "",
      companySize: "",
      referral: "",
    },
  });

  const handleFormSubmit = async (data: ContactFormData) => {
    try {
      if (onSubmit) {
        await onSubmit(data);
      } else {
        console.log("Form submitted:", data);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      setIsSubmitted(true);
      setShowSuccess(true);
      form.reset();
      setTimeout(() => setShowSuccess(false), 4500);
      setTimeout(() => setIsSubmitted(false), 5000);
    } catch {
      form.setError("root", {
        message: "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <section className={cn("relative py-32", className)}>
      <div className="pointer-events-none absolute inset-x-0 -top-20 -bottom-20 bg-[radial-gradient(ellipse_35%_15%_at_40%_55%,hsl(var(--accent))_0%,transparent_100%)] lg:bg-[radial-gradient(ellipse_12%_20%_at_60%_45%,hsl(var(--accent))_0%,transparent_100%)]"></div>
      <div className="pointer-events-none absolute inset-x-0 -top-20 -bottom-20 bg-[radial-gradient(ellipse_35%_20%_at_70%_75%,hsl(var(--accent))_0%,transparent_80%)] lg:bg-[radial-gradient(ellipse_15%_30%_at_70%_65%,hsl(var(--accent))_0%,transparent_80%)]"></div>
      <div className="pointer-events-none absolute inset-x-0 -top-20 -bottom-20 bg-[radial-gradient(hsl(var(--accent-foreground)/0.1)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_60%_at_65%_50%,#000_0%,transparent_80%)] [background-size:8px_8px]"></div>
      <div className="container grid w-full grid-cols-1 gap-x-32 overflow-hidden lg:grid-cols-2">
        <div className="w-full pb-10 md:space-y-10 md:pb-0">
          <div className="space-y-4 md:max-w-[40rem]">
            <h1 className="text-4xl font-medium lg:text-5xl">
              Book free demo now
            </h1>
            <div className="text-muted-foreground md:text-base lg:text-lg lg:leading-7">
              In non libero bibendum odio pellentesque ullamcorper. Aenean
              condimentum, dolor commodo pulvinar bibendum.
            </div>
          </div>
          <div className="hidden md:block">
            <div className="space-y-16 pb-20 lg:pb-0">
              <div className="space-y-6">
                <div className="mt-16 flex overflow-hidden">
                  <Avatar className="size-11 border border-border">
                    <AvatarImage src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp" />
                    <AvatarFallback>SB</AvatarFallback>
                  </Avatar>
                  <Avatar className="-ml-4 size-11 border border-border">
                    <AvatarImage src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-3.webp" />
                    <AvatarFallback>RA</AvatarFallback>
                  </Avatar>
                  <Avatar className="-ml-4 size-11 border border-border">
                    <AvatarImage src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-2.webp" />
                    <AvatarFallback>JS</AvatarFallback>
                  </Avatar>
                </div>
                <div className="space-y-4">
                  <p className="text-sm font-semibold">What you can expect:</p>
                  <div className="flex items-center space-x-2.5">
                    <Check className="size-5 shrink-0 text-muted-foreground" />
                    <p className="text-sm">
                      Detailed product presentation tailored to you
                    </p>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <Check className="size-5 shrink-0 text-muted-foreground" />
                    <p className="text-sm">
                      Consulting on your messaging strategy
                    </p>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <Check className="size-5 shrink-0 text-muted-foreground" />
                    <p className="text-sm">
                      Answers to all the questions you have
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-12">
                <img
                  src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/astro-wordmark.svg"
                  alt="placeholder"
                  className="h-6 dark:invert"
                />
                <img
                  src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcn-ui-wordmark.svg"
                  alt="placeholder"
                  className="h-5 dark:invert"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex w-full justify-center lg:mt-2.5">
          <div className="relative flex w-full max-w-[30rem] min-w-[20rem] flex-col items-center overflow-visible md:min-w-[24rem]">
            <form
              onSubmit={form.handleSubmit(handleFormSubmit)}
              className="z-10 w-full"
            >
              <div className="w-full rounded-xl border border-border bg-card px-6 py-8 shadow-sm">
                {isSubmitted && (
                  <div
                    className={cn(
                      "mb-6 rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-center transition-opacity duration-500",
                      showSuccess ? "opacity-100" : "opacity-0",
                    )}
                  >
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      Thank you! We'll be in touch soon.
                    </p>
                  </div>
                )}

                <FieldGroup className="gap-6">
                  <Controller
                    control={form.control}
                    name="fullName"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>
                          Full name <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                          {...field}
                          id={field.name}
                          aria-invalid={fieldState.invalid}
                          placeholder="Joe Average"
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Company</FieldLabel>
                        <Input
                          {...field}
                          id={field.name}
                          placeholder="Acme Corp"
                        />
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="phone"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>
                          Phone number{" "}
                          <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                          {...field}
                          id={field.name}
                          aria-invalid={fieldState.invalid}
                          placeholder="12 3456 7890"
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>
                          Email (business){" "}
                          <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                          {...field}
                          id={field.name}
                          type="email"
                          aria-invalid={fieldState.invalid}
                          placeholder="name@company.com"
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Country</FieldLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger id={field.name} className="w-full">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aus">Australia</SelectItem>
                            <SelectItem value="usa">United States</SelectItem>
                            <SelectItem value="uk">United Kingdom</SelectItem>
                            <SelectItem value="ca">Canada</SelectItem>
                            <SelectItem value="de">Germany</SelectItem>
                            <SelectItem value="fr">France</SelectItem>
                            <SelectItem value="it">Italy</SelectItem>
                            <SelectItem value="es">Spain</SelectItem>
                            <SelectItem value="nl">Netherlands</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="companySize"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>
                          Company size
                        </FieldLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger id={field.name} className="w-full">
                            <SelectValue placeholder="1-10" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-10">1-10</SelectItem>
                            <SelectItem value="11-50">11-50</SelectItem>
                            <SelectItem value="51-200">51-200</SelectItem>
                            <SelectItem value="200+">200+</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="referral"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>
                          How did you hear about us?
                        </FieldLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger id={field.name} className="w-full">
                            <SelectValue placeholder="Web Search" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="search">Web Search</SelectItem>
                            <SelectItem value="social">Social Media</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="referral">Referral</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />

                  {form.formState.errors.root && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.root.message}
                    </p>
                  )}

                  <div className="flex w-full flex-col justify-end space-y-3 pt-2">
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting ? (
                        <>
                          <LoaderIcon className="mr-2 size-4 animate-spin" />
                          Booking...
                        </>
                      ) : (
                        "Book demo"
                      )}
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      For more information about how we handle your personal
                      information, please visit our{" "}
                      <a href="#" className="underline">
                        privacy policy
                      </a>
                      .
                    </div>
                  </div>
                </FieldGroup>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Contact1 };
