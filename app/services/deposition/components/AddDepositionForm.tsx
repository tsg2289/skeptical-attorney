"use client";
import React, { useState } from 'react';

interface AddDepositionFormProps {
  caseId: string;
  onAdd: (deposition: any) => void;
  onCancel: () => void;
  initialData?: any;
}

const AddDepositionForm = React.memo(function AddDepositionForm({ caseId, onAdd, onCancel, initialData }: AddDepositionFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    deponent_name: initialData?.deponent_name || '',
    deponent_role: initialData?.deponent_role || '',
    deposition_date: initialData?.deposition_date || '',
    taking_attorney: initialData?.taking_attorney || '',
    defending_attorney: initialData?.defending_attorney || '',
    court_reporter: initialData?.court_reporter || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.deponent_name || !formData.deponent_role || !formData.deposition_date) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Auto-generate title from deponent name if not provided
      const title = formData.title || `Deposition of ${formData.deponent_name}`;

      // Create deposition object
      const deposition = {
        ...formData,
        title,
        case_id: caseId,
      };

      onAdd(deposition);
    } catch (err) {
      setError('Failed to add deposition: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-float p-6 sm:p-8 lg:p-10 rounded-2xl w-full">
      <div className="text-center mb-6 sm:mb-8">
        <h3 className="apple-title text-xl sm:text-2xl lg:text-3xl mb-2">{initialData ? 'Edit Deposition' : 'Add New Deposition'}</h3>
        <p className="apple-body text-gray-700 text-sm sm:text-base">{initialData ? 'Update the deposition details' : 'Fill in the details for the new deposition'}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Deponent Info - Two Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label htmlFor="deponent_name" className="block apple-body text-sm font-medium text-gray-700 mb-2">
              Deponent Name *
            </label>
            <input
              type="text"
              id="deponent_name"
              name="deponent_name"
              value={formData.deponent_name}
              onChange={handleInputChange}
              required
              className="glass-input w-full px-4 py-3 text-base apple-body apple-focus rounded-xl"
              placeholder="Enter deponent name"
            />
          </div>

          <div>
            <label htmlFor="deponent_role" className="block apple-body text-sm font-medium text-gray-700 mb-2">
              Deponent Role *
            </label>
            <input
              type="text"
              id="deponent_role"
              name="deponent_role"
              value={formData.deponent_role}
              onChange={handleInputChange}
              required
              className="glass-input w-full px-4 py-3 text-base apple-body apple-focus rounded-xl"
              placeholder="Enter deponent role"
            />
          </div>
        </div>

        {/* Deposition Date - Full Width */}
        <div>
          <label htmlFor="deposition_date" className="block apple-body text-sm font-medium text-gray-700 mb-2">
            Deposition Date *
          </label>
          <input
            type="date"
            id="deposition_date"
            name="deposition_date"
            value={formData.deposition_date}
            onChange={handleInputChange}
            required
            className="glass-input w-full px-4 py-3 text-base apple-body apple-focus rounded-xl"
          />
        </div>

        {/* Attorneys - Two Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label htmlFor="taking_attorney" className="block apple-body text-sm font-medium text-gray-700 mb-2">
              Taking Attorney
            </label>
            <input
              type="text"
              id="taking_attorney"
              name="taking_attorney"
              value={formData.taking_attorney}
              onChange={handleInputChange}
              className="glass-input w-full px-4 py-3 text-base apple-body apple-focus rounded-xl"
              placeholder="Enter taking attorney name"
            />
          </div>

          <div>
            <label htmlFor="defending_attorney" className="block apple-body text-sm font-medium text-gray-700 mb-2">
              Defending Attorney
            </label>
            <input
              type="text"
              id="defending_attorney"
              name="defending_attorney"
              value={formData.defending_attorney}
              onChange={handleInputChange}
              className="glass-input w-full px-4 py-3 text-base apple-body apple-focus rounded-xl"
              placeholder="Enter defending attorney name"
            />
          </div>
        </div>

        {/* Court Reporter - Full Width */}
        <div>
          <label htmlFor="court_reporter" className="block apple-body text-sm font-medium text-gray-700 mb-2">
            Court Reporter
          </label>
          <input
            type="text"
            id="court_reporter"
            name="court_reporter"
            value={formData.court_reporter}
            onChange={handleInputChange}
            className="glass-input w-full px-4 py-3 text-base apple-body apple-focus rounded-xl"
            placeholder="Enter court reporter name"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="glass-card p-4 border border-red-400/30 bg-red-500/10">
            <p className="apple-body text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-4 sm:pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="apple-body text-sm text-gray-600 hover:text-gray-800 apple-focus px-6 py-3 rounded-xl hover:bg-white/5 transition-all duration-300 w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="glass-button px-8 py-3 text-sm font-medium rounded-xl text-gray-800 apple-focus group hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            <span className="group-hover:scale-105 transition-transform duration-300">
              {loading ? (initialData ? 'Updating...' : 'Adding...') : (initialData ? 'Update Deposition' : 'Add Deposition')}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
});

export default AddDepositionForm;

