import { trainerGenderOptions } from "../model/trainer-form";
import type { TrainerGenderValue } from "../model/trainer-form";

interface TrainerGenderSelectProps {
  value: TrainerGenderValue;
  disabled: boolean;
  onChange: (value: TrainerGenderValue) => void;
}

export const TrainerGenderSelect: React.FC<TrainerGenderSelectProps> = ({
  value,
  disabled,
  onChange,
}) => (
  <select
    aria-label="Trainer gender"
    value={value}
    onChange={(e) => onChange(e.target.value as TrainerGenderValue)}
    disabled={disabled}
  >
    {trainerGenderOptions.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);
