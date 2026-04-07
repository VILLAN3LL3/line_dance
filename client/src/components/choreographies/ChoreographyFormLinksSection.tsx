import React from "react";

import { FormField } from "../shared/ui";
import { UrlInput } from "../shared/UrlInput";

interface ChoreographyFormLinksSectionProps {
  step_sheet_link?: string;
  demo_video_url?: string;
  tutorial_video_url?: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
}

export const ChoreographyFormLinksSection: React.FC<ChoreographyFormLinksSectionProps> = ({
  step_sheet_link,
  demo_video_url,
  tutorial_video_url,
  onChange,
}) => (
  <>
    <FormField label="Step Sheet Link" htmlFor="step_sheet_link" className="form-group">
      <UrlInput
        id="step_sheet_link"
        name="step_sheet_link"
        value={step_sheet_link || ""}
        onChange={onChange}
        placeholder="https://example.com/stepsheet"
      />
    </FormField>

    <FormField label="Demo Video URL" htmlFor="demo_video_url" className="form-group">
      <UrlInput
        id="demo_video_url"
        name="demo_video_url"
        value={demo_video_url || ""}
        onChange={onChange}
        placeholder="https://youtube.com/..."
      />
    </FormField>

    <FormField label="Tutorial Video URL" htmlFor="tutorial_video_url" className="form-group">
      <UrlInput
        id="tutorial_video_url"
        name="tutorial_video_url"
        value={tutorial_video_url || ""}
        onChange={onChange}
        placeholder="https://youtube.com/..."
      />
    </FormField>
  </>
);
