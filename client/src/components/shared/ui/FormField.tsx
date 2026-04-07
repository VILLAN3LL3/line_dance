import React from "react";

type FormFieldProps = {
  label?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
};

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  className = "form-group",
  children,
}) => (
  <div className={className}>
    {label && <label htmlFor={htmlFor}>{label}</label>}
    {children}
  </div>
);
