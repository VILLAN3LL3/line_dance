import type { Trainer } from "../../../types";
import { ActionButton, ActionGroup } from "../../../shared/ui";
import { genderLabel } from "../model/trainer-form";
import type { TrainerFormValues } from "../model/trainer-form";
import { TrainerGenderSelect } from "./TrainerGenderSelect";

interface TrainerListItemProps {
  trainer: Trainer;
  isEditing: boolean;
  isBusy: boolean;
  editValues: TrainerFormValues;
  onEditValuesChange: (patch: Partial<TrainerFormValues>) => void;
  onStartEdit: (trainer: Trainer) => void;
  onCancelEdit: () => void;
  onSave: (id: number) => void;
  onDelete: (id: number) => void;
}

export const TrainerListItem: React.FC<TrainerListItemProps> = ({
  trainer,
  isEditing,
  isBusy,
  editValues,
  onEditValuesChange,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}) => (
  <div className="trainer-item">
    {isEditing ? (
      <>
        <input
          type="text"
          value={editValues.name}
          onChange={(e) => onEditValuesChange({ name: e.target.value })}
          disabled={isBusy}
        />
        <input
          type="text"
          value={editValues.phone}
          onChange={(e) => onEditValuesChange({ phone: e.target.value })}
          disabled={isBusy}
        />
        <input
          type="email"
          value={editValues.email}
          onChange={(e) => onEditValuesChange({ email: e.target.value })}
          disabled={isBusy}
        />
        <TrainerGenderSelect
          value={editValues.gender}
          onChange={(gender) => onEditValuesChange({ gender })}
          disabled={isBusy}
        />
        <ActionGroup className="trainer-actions">
          <ActionButton variant="primary" onClick={() => onSave(trainer.id)} disabled={isBusy}>
            Save
          </ActionButton>
          <ActionButton variant="secondary" onClick={onCancelEdit} disabled={isBusy}>
            Cancel
          </ActionButton>
        </ActionGroup>
      </>
    ) : (
      <>
        <div className="trainer-info">
          <h4>{trainer.name}</h4>
          <p>{trainer.phone}</p>
          <p>{trainer.email}</p>
          {trainer.gender && <p>{genderLabel(trainer.gender)}</p>}
        </div>
        <ActionGroup className="trainer-actions">
          <ActionButton variant="edit" onClick={() => onStartEdit(trainer)} disabled={isBusy}>
            ✏️ Edit
          </ActionButton>
          <ActionButton variant="delete" onClick={() => onDelete(trainer.id)} disabled={isBusy}>
            Delete
          </ActionButton>
        </ActionGroup>
      </>
    )}
  </div>
);
