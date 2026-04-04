import React from "react";

import { UrlInput } from "./UrlInput";

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
    <div className="form-group">
      <label htmlFor="step_sheet_link">Step Sheet Link</label>
      <UrlInput
        id="step_sheet_link"
        name="step_sheet_link"
        value={step_sheet_link || ""}
        onChange={onChange}
        placeholder="https://example.com/stepsheet"
      />
    </div>

    <div className="form-group">
      <label htmlFor="demo_video_url">Demo Video URL</label>
      <UrlInput
        id="demo_video_url"
        name="demo_video_url"
        value={demo_video_url || ""}
        onChange={onChange}
        placeholder="https://youtube.com/..."
      />
    </div>

    <div className="form-group">
      <label htmlFor="tutorial_video_url">Tutorial Video URL</label>
      <UrlInput
        id="tutorial_video_url"
        name="tutorial_video_url"
        value={tutorial_video_url || ""}
        onChange={onChange}
        placeholder="https://youtube.com/..."
      />
    </div>
  </>
);
