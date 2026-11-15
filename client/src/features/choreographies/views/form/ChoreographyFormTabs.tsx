import React from "react";

import type { UrlCheckViewModel } from "../../../url-check";
import { ChoreographyFormBasicSection } from "./ChoreographyFormBasicSection";
import { ChoreographyFormLinksSection } from "./ChoreographyFormLinksSection";
import { ChoreographyFormListSection } from "./ChoreographyFormListSection";

import type { ChoreographyFormData } from "../../../../types";

type ChoreographyChangeHandler = (
  event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
) => void;

interface BasicInformationTabProps {
  formData: ChoreographyFormData;
  levels: { id: number; name: string }[];
  errors: {
    name?: string;
    level?: string;
    count?: string;
    wall_count?: string;
    creation_year?: string;
  };
  onChange: ChoreographyChangeHandler;
}

export const BasicInformationTab: React.FC<BasicInformationTabProps> = ({
  formData,
  levels,
  errors,
  onChange,
}) => (
  <div className="form-section">
    <ChoreographyFormBasicSection
      name={formData.name}
      level={formData.level}
      count={formData.count}
      wall_count={formData.wall_count}
      creation_year={formData.creation_year}
      song={formData.song}
      artist={formData.artist}
      levels={levels}
      errors={errors}
      onChange={onChange}
    />
  </div>
);

interface ChoreographersTabProps {
  inputValue: string;
  options: string[];
  selectedValues: string[];
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onInputBlur: () => void;
  onAdd: () => void;
  onRemove: (value: string) => void;
}

export const ChoreographersTab: React.FC<ChoreographersTabProps> = ({
  inputValue,
  options,
  selectedValues,
  onInputChange,
  onInputBlur,
  onAdd,
  onRemove,
}) => (
  <ChoreographyFormListSection
    title="Choreographers"
    showTitle={false}
    listId="authors-list"
    inputValue={inputValue}
    options={options}
    selectedValues={selectedValues}
    placeholder="Choreographer name"
    addButtonLabel="Add Choreographer"
    onInputChange={onInputChange}
    onInputBlur={onInputBlur}
    onAdd={onAdd}
    onRemove={onRemove}
  />
);

interface LinksTabProps {
  formData: ChoreographyFormData;
  errors: { step_sheet_link?: string; demo_video_url?: string; tutorial_video_url?: string };
  urlChecks: {
    stepSheet: UrlCheckViewModel;
    demoVideo: UrlCheckViewModel;
    tutorialVideo: UrlCheckViewModel;
  };
  onChange: ChoreographyChangeHandler;
}

export const LinksTab: React.FC<LinksTabProps> = ({ formData, errors, urlChecks, onChange }) => (
  <div className="form-section">
    <ChoreographyFormLinksSection
      step_sheet_link={formData.step_sheet_link}
      demo_video_url={formData.demo_video_url}
      tutorial_video_url={formData.tutorial_video_url}
      errors={errors}
      urlChecks={urlChecks}
      onChange={onChange}
    />
  </div>
);

interface StepFiguresTabProps {
  inputValue: string;
  options: string[];
  selectedValues: string[];
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onInputBlur: () => void;
  onAdd: () => void;
  onRemove: (value: string) => void;
}

export const StepFiguresTab: React.FC<StepFiguresTabProps> = ({
  inputValue,
  options,
  selectedValues,
  onInputChange,
  onInputBlur,
  onAdd,
  onRemove,
}) => (
  <ChoreographyFormListSection
    title="Step Figures"
    showTitle={false}
    listId="figures-list"
    inputValue={inputValue}
    options={options}
    selectedValues={selectedValues}
    placeholder="Step figure name (e.g., Vine, Shuffle, Grapevine)"
    addButtonLabel="Add Figure"
    onInputChange={onInputChange}
    onInputBlur={onInputBlur}
    onAdd={onAdd}
    onRemove={onRemove}
  />
);

interface HashTagsTabProps {
  inputValue: string;
  options: string[];
  selectedValues: string[];
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onInputBlur: () => void;
  onAdd: () => void;
  onRemove: (value: string) => void;
}

export const HashTagsTab: React.FC<HashTagsTabProps> = ({
  inputValue,
  options,
  selectedValues,
  onInputChange,
  onInputBlur,
  onAdd,
  onRemove,
}) => (
  <ChoreographyFormListSection
    title="Hash Tags"
    showTitle={false}
    listId="tags-list"
    inputValue={inputValue}
    options={options}
    selectedValues={selectedValues}
    placeholder="Tag (e.g., Country, Western, Urban)"
    addButtonLabel="Add Tag"
    onInputChange={onInputChange}
    onInputBlur={onInputBlur}
    onAdd={onAdd}
    onRemove={onRemove}
  />
);
