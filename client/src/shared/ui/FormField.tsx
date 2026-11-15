import React from "react";

type FormFieldProps = {
  label?: string;
  htmlFor?: string;
  className?: string;
  error?: string;
  children: React.ReactNode;
};

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  className = "form-group",
  error,
  children,
}) => (
  <div className={className}>
    {label && <label htmlFor={htmlFor}>{label}</label>}
    {children}
    {error && (
      <span id={`${htmlFor}-error`} className="form-field-error">
        {error}
      </span>
    )}
  </div>
);
