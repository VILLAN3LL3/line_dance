import { useMutation, useQueryClient } from "@tanstack/react-query";

import { downloadBlob } from "../../../shared/browser/download";
import type { DanceCourse } from "../../../types";
import { deleteDanceCourse, exportDanceCoursePdf } from "../api";
import { buildCoursePdfFileName } from "../model/course-detail";
import { courseKeys } from "../queryKeys";

/** Deletes a course (including its sessions) and refreshes cached course data. */
export function useDeleteCourseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseId: number) => deleteDanceCourse(courseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.all }),
  });
}

/** Renders the course as PDF on the server and offers it as a download. */
export function useExportCoursePdfMutation() {
  return useMutation({
    mutationFn: async (course: DanceCourse) => {
      const pdfBlob = await exportDanceCoursePdf(course.id);
      downloadBlob(pdfBlob, buildCoursePdfFileName(course));
    },
  });
}
